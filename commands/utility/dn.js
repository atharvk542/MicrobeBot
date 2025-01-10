const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Fuse = require('fuse.js');
const fs = require('fs');
const { addUser, incrementQuestionCount } = require('../../databases/questionsAnswered.js');
const { addUserIncorrectDiseaseList, incrementDiseaseIncorrectCount } = require('../../databases/incorrectDiseaseList.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dn')
        .setDescription('Gives one question to identiy the name of disease caused by a given microbe.'),
    async execute(interaction) {
        //every time this command is run, try adding the user into the database
        //will not be added if already in database due to nature of function
        addUser(interaction.user.id);
        addUserIncorrectDiseaseList(interaction.user.id);

        //yes i chatgpted this dictionary i was too lazy
        let diseases;

        //will be used for inserting into SQL table later
        let column;

        column = 'numDiseaseName';
        diseases = JSON.parse(fs.readFileSync('commands/utility/dictionaries/diseasenames.json', 'utf8'));

        //prepare fuse.js to allow for leniency in answers
        const fuseOptions = {
            includeScore: true,
            threshold: 0.4,
        };

        const diseaseNames = Object.keys(diseases);
        const randomDisease = diseaseNames[Math.floor(Math.random() * diseaseNames.length)];
        const classification = diseases[randomDisease];

        //prepare fuse.js instance for leniency
        const fuse = new Fuse([classification], fuseOptions);

        await interaction.reply(`Name the microbe which causes this disease: **${randomDisease}**.`);

        const collector = interaction.channel.createMessageCollector({
            time: 60000,
            max: 1,
        });

        //allows for controlling of messages if a hint is used because it is important
        let hintUsed = false;

        //essentially makes it so every round, one outcome is guaranteed: either stop, timeout, or answered
        await new Promise(resolve => {
            collector.on('collect', async message => {
                if (message.author.id !== interaction.user.id) {
                    return; // Ignore messages from other users
                }
                
                if (message.content.trim().toLowerCase() === 'stop' && message.author.id === interaction.user.id) {
                    await message.reply('Stopping quiz.');
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
                    if (result.length > 0 && result[0].score < 0.4 && message.author.id === interaction.user.id) {
                        await message.reply('Correct!');
                        incrementQuestionCount(interaction.user.id, column); //inserts into database on column specified earlier
                        resolve();
                    } else {
                        await message.reply(`Incorrect. The correct classification was **${classification}**.`);
                        incrementDiseaseIncorrectCount(interaction.user.id, randomDisease);
                        resolve();
                    }
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    //closes the question stored earlier to reduce message clutter
                    await interaction.followUp('Question closed due to 60 seconds of inactivity.');
                    resolve();
                }
            });
        });

        //create an entire other promise to handle the second message if they used a hint
        if (hintUsed) {

            //make a new collector
            const collector = interaction.channel.createMessageCollector({
                time: 60000,
                max: 1,
            });

            await new Promise(resolve => {
                collector.on('collect', async message => {
                    if (message.author.id !== interaction.user.id) {
                        return; // Ignore messages from other users
                    }
                    
                    //stops on message 'stop'
                    if (message.content.trim().toLowerCase() === 'stop' && message.author.id === interaction.user.id) {
                        await message.reply('Stopping quiz.');
                        resolve();
                        return;
                    }

                    //checks correct or incorrect, even if they say the word 'hint' it will be incorrect
                    const result = fuse.search(message.content.trim()) && message.author.id === interaction.user.id;
                    if (result.length > 0 && result[0].score < 0.4) {
                        await message.reply('Correct!');
                        resolve();
                    } else {
                        await message.reply(`Incorrect. The correct classification was **${classification}**.`);
                        incrementDiseaseIncorrectCount(interaction.user.id, randomDisease);
                        resolve();
                    }

                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        await interaction.followUp('Question closed due to 60 seconds of inactivity.');
                        resolve();
                    }
                });
            });
        }

    },
};