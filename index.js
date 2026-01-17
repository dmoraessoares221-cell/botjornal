require('dotenv').config();
const config = require('./config');

const {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= BOT ONLINE ================= */
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);

  await client.application.commands.create(
    new SlashCommandBuilder()
      .setName('registro')
      .setDescription('Registro oficial do Jornal Vice City')
  );
});

/* ================= INTERAÇÕES ================= */
client.on(Events.InteractionCreate, async interaction => {

  /* ===== /registro ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === 'registro') {
    const modal = new ModalBuilder()
      .setCustomId('registro_modal')
      .setTitle('Registro — Jornal Vice City');

    const nomeInput = new TextInputBuilder()
      .setCustomId('nome')
      .setLabel('Nome completo')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const idInput = new TextInputBuilder()
      .setCustomId('id')
      .setLabel('ID')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nomeInput),
      new ActionRowBuilder().addComponents(idInput)
    );

    return interaction.showModal(modal);
  }

  /* ===== ENVIO DO MODAL ===== */
  if (interaction.isModalSubmit() && interaction.customId === 'registro_modal') {

    const nome = interaction.fields.getTextInputValue('nome');
    const id = interaction.fields.getTextInputValue('id');

    const canal = interaction.guild.channels.cache.get(config.canalRegistro);
    if (!canal) {
      return interaction.reply({ content: '❌ Canal de registro não configurado.', flags: 64 });
    }

    const embed = new EmbedBuilder()
      .setTitle('📝 Novo Registro')
      .setColor(0x3498db)
      .addFields(
        { name: 'Usuário', value: `<@${interaction.user.id}>` },
        { name: 'Nome', value: nome },
        { name: 'ID', value: id }
      );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`cargo_${interaction.user.id}`)
      .setPlaceholder('Selecione o cargo desejado')
      .addOptions(
        config.cargos.map(cargo => ({
          label: cargo.nome,
          value: cargo.id
        }))
      );

    await canal.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(selectMenu)]
    });

    return interaction.reply({
      content: '📨 Registro enviado para análise.',
      flags: 64
    });
  }

  /* ===== SELEÇÃO DE CARGO ===== */
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('cargo_')) {
    const userId = interaction.customId.split('_')[1];

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ Apenas o autor pode escolher o cargo.', flags: 64 });
    }

    const cargoId = interaction.values[0];
    const cargo = config.cargos.find(c => c.id === cargoId);

    if (!cargo) {
      return interaction.reply({ content: '❌ Cargo inválido.', flags: 64 });
    }

    const antigo = interaction.message.embeds[0];

    const novoEmbed = new EmbedBuilder()
      .setTitle(antigo.title)
      .setColor(antigo.color || 0x3498db)
      .setFields([
        ...antigo.fields,
        { name: 'Cargo solicitado', value: cargo.nome }
      ]);

    const aprovar = new ButtonBuilder()
      .setCustomId(`aprovar_${userId}_${cargoId}`)
      .setLabel('✅ Aprovar')
      .setStyle(ButtonStyle.Success);

    const reprovar = new ButtonBuilder()
      .setCustomId(`reprovar_${userId}`)
      .setLabel('❌ Reprovar')
      .setStyle(ButtonStyle.Danger);

    await interaction.update({
      embeds: [novoEmbed],
      components: [new ActionRowBuilder().addComponents(aprovar, reprovar)]
    });
  }

  /* ===== APROVAR ===== */
  if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
    const [, userId, cargoId] = interaction.customId.split('_');
    const membro = await interaction.guild.members.fetch(userId);

    await membro.roles.add(cargoId);

    await interaction.update({
      content: '✅ Registro aprovado e cargo aplicado.',
      embeds: [],
      components: []
    });
  }

  /* ===== REPROVAR ===== */
  if (interaction.isButton() && interaction.customId.startsWith('reprovar_')) {
    await interaction.update({
      content: '❌ Registro reprovado.',
      embeds: [],
      components: []
    });
  }
});

/* ================= LOGIN ================= */
client.login(process.env.TOKEN);
