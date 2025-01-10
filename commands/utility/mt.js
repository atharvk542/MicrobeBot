const { SlashCommandBuilder } = require('discord.js');
const Fuse = require('fuse.js');
const fs = require('fs');
const { addUser, incrementQuestionCount } = require('../../databases/questionsAnswered.js');
const { addUserIncorrectMicrobeList, incrementMicrobeIncorrectCount } = require('../../databases/incorrectMicrobeList.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mt')
        .setDescription('Classify type of an individual microbe based on a given microbe.'),
    async execute(interaction) {
        await interaction.deferReply();

        //every time this command is run, try adding the user into the database
        //will not be added if already in database due to nature of function
        addUser(interaction.user.id);
        addUserIncorrectMicrobeList(interaction.user.id);

        //yes i chatgpted this dictionary i was too lazy
        let microbes;

        //will be used for inserting into SQL table later
        let column;

        column = 'numMicrobeName';
        microbes = JSON.parse(fs.readFileSync('commands/utility/dictionaries/microbetypes.json', 'utf8'));

        //prepare fuse.js to allow for leniency in answers
        const fuseOptions = {
            includeScore: true,
            threshold: 0.4,
        };

        const microbeNames = Object.keys(microbes);
        const randomMicrobe = microbeNames[Math.floor(Math.random() * microbeNames.length)];
        const classification = microbes[randomMicrobe];

        //prepare fuse.js instance for leniency
        const fuse = new Fuse([classification], fuseOptions);

        await interaction.editReply(`Classify the type of this microbe: **${randomMicrobe}**.`);

        const collector = interaction.channel.createMessageCollector({
            time: 60000,
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
                    await interaction.followUp('Stopping quiz.');
                    collector.stop()
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
                    if (result.length > 0 && result[0].score < 0.4 && message.author.id === interaction.user.id) {
                        await interaction.followUp('Correct!');
                        incrementQuestionCount(interaction.user.id, column); //inserts into database on column specified earlier
                        collector.stop();
                        resolve();
                    } else {
                        await interaction.followUp(`Incorrect. The correct classification was **${classification}**.`);
                        incrementMicrobeIncorrectCount(interaction.user.id, randomMicrobe);
                        collector.stop();
                        resolve();
                    }
                }
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    //closes the question stored earlier to reduce message clutter
                    await interaction.followUp('Question closed due to 60 seconds of inactivity.');
                    collector.stop();
                    resolve();
                }
            });
        });

        //create an entire other promise to handle the second message if they used a hint
        if (hintUsed) {

            //make a new collector
            const collector = interaction.channel.createMessageCollector({
                time: 60000,
            });

            await new Promise(resolve => {
                collector.on('collect', async message => {
                    if (message.author.id !== interaction.user.id) {
                        return; // Ignore messages from other users
                    }
                    
                    //stops on message 'stop'
                    if (message.content.trim().toLowerCase() === 'stop' && message.author.id === interaction.user.id) {
                        await interaction.followUp('Stopping quiz.');
                        collector.stop();
                        resolve();
                        return;
                    }

                    //checks correct or incorrect, even if they say the word 'hint' it will be incorrect
                    const result = fuse.search(message.content.trim() && message.author.id === interaction.user.id);
                    if (result.length > 0 && result[0].score < 0.4) {
                        await interaction.followUp('Correct!');
                        collector.stop();
                        resolve();
                    } else {
                        await interaction.followUp(`Incorrect. The correct classification was **${classification}**.`);
                        incrementMicrobeIncorrectCount(interaction.user.id, randomMicrobe);
                        collector.stop();
                        resolve();
                    }

                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        await interaction.followUp('Question closed due to 60 seconds of inactivity.');
                        collector.stop();
                        resolve();
                    }
                });
            });
        }

    },
}