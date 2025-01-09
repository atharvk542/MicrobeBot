const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserStats } = require("../../databases/questionsAnswered.js");


module.exports = {
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Lists total number of questions answered of each identification type for the user.'),
	async execute(interaction) {
        const typeidentify = await getUserStats(interaction.user.id, 'numMicrobeType');
        const diseaseidentifyType = await getUserStats(interaction.user.id, 'numDiseaseType');
        const diseaseidentifyName = await getUserStats(interaction.user.id, 'numDiseaseName');
		
		const menu = new EmbedBuilder()
			.setColor('Blurple')
			.setTitle('Questions Answered')
			.setAuthor({ name: 'MicrobeBot'})
            .addFields(
                { name: 'Microbe questions: ', value: typeidentify.toString()},
                { name: 'Disease Type questions:', value: diseaseidentifyType.toString()},
                { name: 'Disease Name questions:', value:  diseaseidentifyName.toString()}
            )
		await interaction.reply({ embeds: [menu] });
	},
};