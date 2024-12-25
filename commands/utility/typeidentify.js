const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('typeidentify')
        .setDescription('Given the microbe, identify the type.')
        .addIntegerOption(option => 
            option
                .setName('timer')
                .setDescription('Timer amount to identify each microbe, integer amount in seconds')),
    async execute(interaction) {
        const microbes = {
            'Escherichia coli': 'Bacteria',
            'Rickettsia rickettsii': 'Bacteria',
            'Mycobacterium leprae': 'Bacteria',
            'Mycobacterium tuberculosis': 'Bacteria',
            'Microcystis aeruginosa': 'Bacteria',
            'Staphylococcus aureus': 'Bacteria',
            'Helicobacter pylori': 'Bacteria',
            'Vibrio cholerae': 'Bacteria',
            'Streptococcus pneumoniae': 'Bacteria',
            'Corynebacterium diphtheriae': 'Bacteria',
            'Methicillin-resistant Staphylococcus aureus (MRSA)': 'Bacteria',
            'Cutibacterium acnes': 'Bacteria',
            'Haemophilus influenzae': 'Bacteria',
            'Wolbachia species': 'Bacteria',
            'Agrobacterium tumefaciens': 'Bacteria',
            'Pyrococcus furiosus': 'Archaea',
            'Methanococcus sp.': 'Archaea',
            'Plasmodium falciparum': 'Protist',
            'Paramecium sp.': 'Protist',
            'Giardia duodenalis': 'Protist',
            'Toxoplasma gondii': 'Protist',
            'Alexandrium catenella': 'Protist',
            'Saccharomyces cerevisiae': 'Fungi',
            'Candida aureus': 'Fungi',
            'Alternaria solani': 'Fungi',
            'Nannochloropsis sp.': 'Algae',
            'Taenia solium': 'Worm',
            'Ancylostoma duodenale': 'Worm',
            'Escherichia virus T4': 'Virus',
            'Escherichia virus Lambda': 'Virus',
            'Measles virus': 'Virus',
            'Smallpox virus': 'Virus',
            'SARS-CoV-2 virus': 'Virus',
            'Human Immunodeficiency Virus (HIV-1)': 'Virus',
            'Influenza A virus': 'Virus',
            'Hepatitis B virus': 'Virus',
            'Canine parvovirus 2': 'Virus',
            'Mimivirus': 'Virus',
            'Poliovirus': 'Virus',
            'Banana bunchy top virus': 'Virus',
            'Major Prion Protein (PrP)': 'Prion',
            'Amyloid beta': 'Prion',
            'Tau proteins': 'Prion',
            'α-Synuclein': 'Prion',
            'Potato spindle tuber viroid': 'Viroid'
        };

        //assign timer input
        const timer = interaction.options.getInteger('timer') ?? 10;        

        let quizActive = true;

        //send first prompt
        await interaction.reply("Quiz started! Type 'stop' to end the quiz.");

        while (quizActive) {
            const microbeNames = Object.keys(microbes);
            const randomMicrobe = microbeNames[Math.floor(Math.random() * microbeNames.length)];
            const classification = microbes[randomMicrobe];

            await interaction.followUp(`Classify this microbe: **${randomMicrobe}**, you have **${timer}** seconds. Type "stop" to end the quiz.`);

            const collector = interaction.channel.createMessageCollector({
                time: (timer * 1000), //needs to be in ms
                max: 1,
            });
            
            //essentially makes it so every round, one outcome is guaranteed: either stop, timeout, or answered
            await new Promise(resolve => {
                collector.on('collect', async message => {
                    if (message.content.trim().toLowerCase() === "stop" && message.author.id === interaction.user.id) {
                        message.reply("stopping quiz");
                        quizActive = false;
                        resolve();
                        return;
                    }

                    if (message.content.trim().toLowerCase() === classification.toLowerCase()) {
                        await message.reply('correct');
                    } else {
                        await message.reply(`incorrect, classification was **${classification}**`);
                    }

                    resolve();
                });

                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        await interaction.followUp('Time is up!');
                        resolve();
                    }
                });
            });
        }
    },
};
