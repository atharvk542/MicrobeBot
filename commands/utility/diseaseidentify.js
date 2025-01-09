const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Fuse = require('fuse.js');
const fs = require('fs');
const { addUser, incrementQuestionCount } = require('../../databases/questionsAnswered.js');
const { addUserIncorrectDiseaseList, incrementDiseaseIncorrectCount } = require('../../databases/incorrectDiseaseList.js');


//create json objects that will hold how many of each microbe user got correct / incorrect
let correctDict = {};
let incorrectDict = {};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('diseaseidentify')
        .setDescription('Given the disease, identify the type/name of microbe that causes the disease.')
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('Sets the mode to either identify the type of microbe or name of the microbe based on disease.')
                .setRequired(true)
                .addChoices(
                    { name: 'Name', value: 'name' },
                    { name: 'Type', value: 'type' }
                )
        )
        .addIntegerOption(option =>
            option
                .setName('timer')
                .setDescription('Timer amount to identify each disease, integer amount in seconds.')
        ),
    async execute(interaction) {
        //every time this command is run, try adding the user into the database
        //will not be added if already in database due to nature of function
        addUser(interaction.user.id);
        addUserIncorrectDiseaseList(interaction.user.id);

        //yes i chatgpted this dictionary i was too lazy
        const mode = interaction.options.getString('mode');
        let diseases;

        //will be used for inserting into SQL table later
        let column;

        if (mode === 'type') {
            column = 'numDiseaseType';
            diseases = JSON.parse(fs.readFileSync('commands/utility/dictionaries/diseasetypes.json', 'utf8'));
        } else {
            column = 'numDiseaseName'
            diseases = JSON.parse(fs.readFileSync('commands/utility/dictionaries/diseasenames.json', 'utf8'));
        }

        //assign timer input and make sure it is between 1 and 60
        let timer = interaction.options.getInteger('timer') ?? 10;
        if (timer < 1) {
            timer = 1;
        } else if (timer > 60) {
            timer = 60;
        }
        
        //assigns the correct/incorrect dictionaries the keys of the diseases, but values set to 0
        for (const key of Object.keys(diseases)) {
            correctDict[key] = 0;
            incorrectDict[key] = 0;
        }

        //controls the loop for the quiz to keep running
        let quizActive = true;

        //prepare fuse.js to allow for leniency in answers
        const fuseOptions = {
            includeScore: true,
            threshold: 0.4,
        };

        //send first prompt
        await interaction.reply('Quiz started! Type "stop" to end the quiz, or type "hint" for a hint.');

        //if this counter reaches 3, the bot automatically stops due to inactivity
        let unansweredCounter = 0;

        //keeps bot continuously asking questions
        while (quizActive) {

            const diseaseNames = Object.keys(diseases);
            const randomDisease = diseaseNames[Math.floor(Math.random() * diseaseNames.length)];
            const classification = diseases[randomDisease];

            //prepare fuse.js instance for leniency
            const fuse = new Fuse([classification], fuseOptions);
            
            //slightly changes question based on type or name mode for clarity
            if (mode === 'type') {
                await interaction.followUp(`Classify the microbe which causes this disease: **${randomDisease}**, you have **${timer}** seconds.`);
            } else {
                await interaction.followUp(`Name the microbe which causes this disease: **${randomDisease}**, you have **${timer}** seconds.`);
            }

            const collector = interaction.channel.createMessageCollector({
                time: (timer * 1000), //needs to be in ms
                max: 1,
            });
            
            //allows for controlling of messages if a hint is used because it is important
            let hintUsed = false;

            //essentially makes it so every round, one outcome is guaranteed: either stop, timeout, or answered
            await new Promise(resolve => {
                collector.on('collect', async message => {

                    if (message.content.trim().toLowerCase() === 'stop' && message.author.id === interaction.user.id) {
                        await message.reply('Stopping quiz.');
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
                        await message.reply(`The first letter is: **${firstLetter}**. This will not count as a solved problem.`);
                        hintUsed = true;
                        resolve();
                    }
                    
                    //if they didn't use a hint, handle their answer as normal
                    if (!hintUsed) {
                        const result = fuse.search(message.content.trim());
                        if (result.length > 0 && result[0].score < 0.4) {
                            await message.reply('Correct!');
                            incrementQuestionCount(interaction.user.id, column); //inserts into database on column specified earlier
                            correctDict[randomDisease] += 1;
                            resolve();
                        } else {
                            await message.reply(`Incorrect. The correct classification was **${classification}**.`);
                            incorrectDict[randomDisease] += 1;
                            incrementDiseaseIncorrectCount(interaction.user.id, randomDisease);
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

            //create an entire other promise to handle the second message if they used a hint
            if (hintUsed) {

                //make a new collector
                const collector = interaction.channel.createMessageCollector({
                    time: (timer * 1000), //needs to be in ms
                    max: 1,
                });

                await new Promise(resolve => {
                    collector.on('collect', async message => {

                        //stops on message 'stop'
                        if (message.content.trim().toLowerCase() === 'stop' && message.author.id === interaction.user.id) {
                            await message.reply('Stopping quiz.');
                            quizActive = false;
                            const correctEmbed = correctAnswers();
                            const incorrectEmbed = incorrectAnswers();
                            await interaction.followUp({ embeds: [correctEmbed]});
                            await interaction.followUp({ embeds: [incorrectEmbed]});
                            resolve();
                            return;
                        }
                        
                        //checks correct or incorrect, even if they say the word 'hint' it will be incorrect
                        const result = fuse.search(message.content.trim());
                        if (result.length > 0 && result[0].score < 0.4) {
                            await message.reply('Correct!');
                            resolve();
                        } else {
                            await message.reply(`Incorrect. The correct classification was **${classification}**.`);
                            incorrectDict[randomDisease] += 1;
                            incrementDiseaseIncorrectCount(interaction.user.id, randomDisease);
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

            //if they haven't answered 3 times in a row, bot stops
            if(unansweredCounter === 3) {
                await interaction.followUp("Didn't answer 3 times in a row, so bot is stopping.");
                quizActive = false;
                const correctEmbed = correctAnswers();
                const incorrectEmbed = incorrectAnswers();
                await interaction.followUp({ embeds: [correctEmbed]});
                await interaction.followUp({ embeds: [incorrectEmbed]});
                return;
            }
        }
    },
};

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
        .setTitle('Top 25 Most Frequently Correct Diseases')
        .setDescription('Correct answers for this session only')
        .setAuthor({ name: 'MicrobeBot'})
    
    //for each microbe in the correct answers dictionary, add the field to the embed
    //also sort dictiontary in descending order
    correctDict = Object.fromEntries(Object.entries(correctDict).sort((a, b) => b[1] - a[1]));

    for (const [diseaseName, num] of Object.entries(correctDict)) {
        if (num > 0) {
            if (loopNum === 25) break;
            correctEmbed.addFields({ name: diseaseName, value: num.toString() });
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
        .setTitle('Top 25 Most Frequently Incorrect Diseases')
        .setDescription('Incorrect answers for this session only')
        .setAuthor({ name: 'MicrobeBot'})
    
    //for each microbe in the correct answers dictionary, add the field to the embed
    //sort dictionary in descending order
    incorrectDict = Object.fromEntries(Object.entries(incorrectDict).sort((a, b) => b[1] - a[1]));
    for (const [diseaseName, num] of Object.entries(incorrectDict)) {
        if (num > 0) {
            if (loopNum === 25) break;
            incorrectEmbed.addFields({ name: diseaseName, value: num.toString() });
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