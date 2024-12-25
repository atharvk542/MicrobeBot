const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('diseaseidentify')
        .setDescription('Given the disease, identify the type of microbe that causes the disease.')
        .addIntegerOption(option => 
            option
                .setName('timer')
                .setDescription('Timer amount to identify each disease, integer amount in seconds')),
    async execute(interaction) {
		//yes i chatgpted this dictionary i was too lazy
        const diseases = {
			"Diarrhea": "bacteria", // Escherichia coli
			"Rocky Mountain Spotted Fever": "bacteria", // Rickettsia rickettsii
			"Leprosy": "bacteria", // Mycobacterium leprae
			"Tuberculosis": "bacteria", // Mycobacterium tuberculosis
			"Cyanotoxin poisoning": "bacteria", // Microcystis aeruginosa
			"Staph infections": "bacteria", // Staphylococcus aureus
			"Stomach Ulcers": "bacteria", // Helicobacter pylori
			"Anthrax": "bacteria", // Bacillus anthracis
			"Malaria": "protist", // Plasmodium falciparum
			"Baker's yeast-related conditions": "fungus", // Saccharomyces cerevisiae
			"Blue-green algae infections": "protist", // Nannochloropsis sp.
			"Parasitic infections in water systems": "protist", // Paramecium sp.
			"Bacteriophage infections": "virus", // Escherichia virus T4, Escherichia virus Lambda
			"Measles": "virus", // Measles virus
			"Smallpox": "virus", // Smallpox virus
			"COVID-19": "virus", // SARS-CoV-2 virus
			"HIV/AIDS": "virus", // Human Immunodeficiency Virus
			"Prion diseases (e.g., Creutzfeldt-Jakob disease)": "prion", // Major Prion Protein
			"Influenza": "virus", // Influenza A virus
			"Hepatitis B": "virus", // Hepatitis B virus
			"Canine Parvovirus Infection": "virus", // Canine parvovirus 2
			"Polio": "virus", // Poliovirus
			"Banana Bunchy Top Disease": "virus", // Banana bunchy top virus
			"Cholera": "bacteria", // Vibrio cholerae
			"Diphtheria": "bacteria", // Corynebacterium diphtheriae
			"MRSA infections": "bacteria", // Methicillin-resistant Staphylococcus aureus
			"Acne": "bacteria", // Cutibacterium acnes
			"Meningitis": "bacteria", // Haemophilus influenzae
			"Elephantiasis (with filarial worms)": "bacteria", // Wolbachia species
			"Crown Gall Disease": "bacteria", // Agrobacterium tumefaciens
			"Candidiasis": "fungi", // Candida aureus
			"Early Blight in Tomatoes": "fungi", // Alternaria solani
			"Giardiasis": "protist", // Giardia duodenalis
			"Toxoplasmosis": "protist", // Toxoplasma gondii
			"Paralytic Shellfish Poisoning": "protist", // Alexandrium catenella
			"Creutzfeldt-Jakob Disease": "prion", // CJD
    		"Bovine Spongiform Encephalopathy": "prion", // BSE (Mad Cow Disease)
			"Taeniasis": "worm", // Taenia solium
			"Hookworm Infection": "worm", // Ancylostoma duodenale
			"Potato Spindle Tuber Disease": "viroid" // Potato spindle tuber viroid
        };

        //assign timer input
        const timer = interaction.options.getInteger('timer') ?? 10;        

        let quizActive = true;

        //send first prompt
        await interaction.reply('Quiz started! Type "stop" to end the quiz');

        while (quizActive) {
            const diseaseNames = Object.keys(diseases);
            const randomDisease = diseaseNames[Math.floor(Math.random() * diseaseNames.length)];
            const classification = diseases[randomDisease];

            await interaction.followUp(`Classify the microbe which causes this disease: **${randomDisease}**, you have **${timer}** seconds. Type "stop" to end the quiz.`);

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
