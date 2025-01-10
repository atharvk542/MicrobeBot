const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Fuse = require('fuse.js');
const fs = require('fs');
const { addUser, incrementQuestionCount } = require('../../databases/questionsAnswered.js');
const { addUserIncorrectMicrobeList, incrementMicrobeIncorrectCount } = require('../../databases/incorrectMicrobeList.js');

//create json objects that will hold how many of each microbe user got correct / incorrect
let correctDict = {};
let incorrectDict = {};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('typeidentify')
        .setDescription('Given the microbe, identify the type.')
        .addIntegerOption(option =>
            option
                .setName('timer')
                .setDescription('Timer amount to identify each microbe, integer amount in seconds. Minimum 1, maximum 60.')),
    async execute(interaction) {
        await interaction.deferReply();
        //every time this command is run, try adding the user into the database
        //will not be added if already in database due to nature of function
        addUser(interaction.user.id);
        addUserIncorrectMicrobeList(interaction.user.id);
        
        const microbes = JSON.parse(fs.readFileSync('commands/utility/dictionaries/microbetypes.json', 'utf8'));

        //assign timer input and make sure it is between 1 and 60
        let timer = interaction.options.getInteger('timer') ?? 10;
        if (timer < 1) {
            timer = 1;
        } else if (timer > 60) {
            timer = 60;
        }

        for (const key of Object.keys(microbes)) {
            correctDict[key] = 0;
            incorrectDict[key] = 0;
        }

        //prepare fuse.js to allow for leniency in answers
        const fuseOptions = {
            includeScore: true,
            threshold: 0.4,
        };

        let quizActive = true;

        //send first prompt
        await interaction.reply("Quiz started! Type 'stop' to end the quiz.");

        let unansweredCounter = 0;

        while (quizActive) {
            const microbeNames = Object.keys(microbes);
            const randomMicrobe = microbeNames[Math.floor(Math.random() * microbeNames.length)];
            const classification = microbes[randomMicrobe];

            //prepare fuse.js instance
            const fuse = new Fuse([classification], fuseOptions);

            await interaction.editReply(`Classify this microbe: **${randomMicrobe}**, you have **${timer}** seconds. Type "stop" to end the quiz.`,);

            const collector = interaction.channel.createMessageCollector({
                time: (timer * 1000), //needs to be in ms
                max: 1,
            });

            let hintUsed = false;

            //essentially makes it so every round, one outcome is guaranteed: either stop, timeout, or answered
            await new Promise(resolve => {
                collector.on('collect', async message => {
                    if (message.content.trim().toLowerCase() === "stop" && message.author.id === interaction.user.id) {
                        await interaction.followUp('Stopping quiz.');
                        quizActive = false;
                        const correctEmbed = correctAnswers();
                        const incorrectEmbed = incorrectAnswers();
                        await interaction.followUp({ embeds: [correctEmbed]});
                        await interaction.followUp({ embeds: [incorrectEmbed]});
                        resolve();
                        return;
                    }

                    //if they used a hint, update the variable so the second promise can handle their answer
                    if (message.content.trim().toLowerCase() === 'hint' && message.author.id === interaction.user.id) {
                        let firstLetter = classification[0];
                        await interaction.followUp(`The first letter is: **${firstLetter}**. This will not count as a solved problem.`);
                        hintUsed = true;
                        resolve();
                    }

                    //if they didn't use a hint, handle their answer as normal
                    if (!hintUsed) {
                        const result = fuse.search(message.content.trim());
                        if (result.length > 0 && result[0].score < 0.4) {
                            await message.reply('Correct!');
                            incrementQuestionCount(interaction.user.id, 'numMicrobeType'); //inserts into database on column specified earlier
                            correctDict[randomMicrobe] += 1;
                            resolve();
                        } else {
                            await message.reply(`Incorrect. The correct classification was **${classification}**.`);
                            incorrectDict[randomMicrobe] += 1;
                            incrementMicrobeIncorrectCount(interaction.user.id, randomMicrobe);
                            resolve();
                        }
                    }
                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        await interaction.followUp('Time is up!');
                        unansweredCounter++;
                        resolve();
                    }
                });
            });

            //make another promise and collector to handle the answer if they used a hint
            if (hintUsed) {

                //make a new collector
                const collector = interaction.channel.createMessageCollector({
                    time: (timer * 1000), //needs to be in ms
                    max: 1,
                });

                await new Promise(resolve => {
                    collector.on('collect', async message => {
                        if (message.content.trim().toLowerCase() === "stop" && message.author.id === interaction.user.id) {
                            message.reply("Stopping quiz.");
                            quizActive = false;
                            const correctEmbed = correctAnswers();
                            const incorrectEmbed = incorrectAnswers();
                            await interaction.followUp({ embeds: [correctEmbed]});
                            await interaction.followUp({ embeds: [incorrectEmbed]});
                            resolve();
                            return;
                        }

                        //handle answer as normal. if they enter "hint" again, it will be counted as incorrect
                        const result = fuse.search(message.content.trim());
                        if (result.length > 0 && result[0].score < 0.4) {
                            await message.reply('Correct!');
                            resolve();
                        } else {
                            await message.reply(`Incorrect. The correct classification was **${classification}**.`);
                            incorrectDict[randomMicrobe] += 1;
                            incrementMiseaseIncorrectCount(interaction.user.id, randomMicrobe);
                            resolve();
                        }
                    });

                    collector.on('end', async collected => {
                        if (collected.size === 0) {
                            await interaction.followUp('Time is up!');
                            resolve();
                        }
                    });
                });
            }

            if (unansweredCounter === 3) {
                await interaction.followUp("Didn't answer 3 times in a row, so bot is stopping.");
                quizActive = false;
                const correctEmbed = correctAnswers();
                const incorrectEmbed = incorrectAnswers();
                await interaction.followUp({ embeds: [correctEmbed]});
                await interaction.followUp({ embeds: [incorrectEmbed]});
                return;
            }
        }
        
        //ONLY SHOWS TOP 25!!!!
        //every time the session ends, return an embed that loops through every microbe and says how many of it they got correct and incorrect
        //correct will be on one page, incorrect on another
        //do not include any if the count is 0
        function correctAnswers() {
            if (!correctDict) return;
        
            let hasContent = false;
            let correctEmbed
        
            let loopNum = 0; // only 25 fields allowed in an embed, this will count the max
            correctEmbed = new EmbedBuilder()
                .setColor('Blurple')
                .setTitle('Top 25 Most Frequently Correct Microbes')
                .setDescription('Correct answers for this session only')
                .setAuthor({ name: 'MicrobeBot'})
            
            //for each microbe in the correct answers dictionary, add the field to the embed
            for (const [microbeName, num] of Object.entries(correctDict)) {
                if (num > 0) {
                    if (loopNum === 25) break;
                    correctEmbed.addFields({ name: microbeName, value: num.toString() });
                    hasContent = true;
                    loopNum++
                }
            }
        
            if (!hasContent) {
                correctEmbed = new EmbedBuilder()
                    .setColor('Blurple')
                    .setTitle('You had 0 correct questions')
            }
        
            return correctEmbed;
        }
        
        function incorrectAnswers() {
            if (!incorrectDict) return;
            
            let hasContent = false;
            let incorrectEmbed;
        
            let loopNum = 0; // only 25 fields allowed in an embed, this will count the max
            incorrectEmbed = new EmbedBuilder()
                .setColor('Blurple')
                .setTitle('Top 25 Most Frequently Incorrect Microbes')
                .setDescription('Incorrect answers for this session only')
                .setAuthor({ name: 'MicrobeBot'})
            
            //for each microbe in the correct answers dictionary, add the field to the embed
            for (const [microbeName, num] of Object.entries(incorrectDict)) {
                if (num > 0) {
                    if (loopNum === 25) break;
                    incorrectEmbed.addFields({ name: microbeName, value: num.toString() });
                    hasContent = true;
                    loopNum++
                }
            }
        
            if (!hasContent) {
                incorrectEmbed = new EmbedBuilder()
                    .setColor('Blurple')
                    .setTitle('You had 0 incorrect questions')
            }
        
            return incorrectEmbed;
        }
    },
};
