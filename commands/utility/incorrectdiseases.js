const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserStats } = require("../../databases/incorrectDiseaseList.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('incorrectdiseases')
		.setDescription('Lists the current top 25 diseases that you get incorrect the most'),
	async execute(interaction) {
		let menu = new EmbedBuilder()
			.setColor('Blurple')
			.setTitle('Incorrect Questions')
			.setAuthor({ name: 'MicrobeBot'})
							
		let stats = await getUserStats(interaction.user.id);

		stats.sort((a, b) => b.amount - a.amount);

		let diseases = stats.map(entry => entry.disease); //gets every single "disease" string in each object of stats array
		let usedDiseases = {};

		let loopNum = 0;
		for (const curDisease of diseases) {
			const entry = stats.find(entry => entry.disease === curDisease); //finds the amount for ceritified disease

			if (entry.amount <= 0) continue;
			if (loopNum === 25) break;	//this needs to be after the previous line, as loopNum can't increment if the entry = 0
			
			menu.addFields( { name: curDisease, value: entry.amount.toString() });
			
			usedDiseases[loopNum] = curDisease;
			loopNum++;
		}
		
		if (Object.keys(usedDiseases).length === 0) {
			menu = new EmbedBuilder()
				.setColor('Blurple')
				.setTitle('You currently have 0 incorrect questions')
		}

		await interaction.reply({ embeds: [menu] });
	},
};



