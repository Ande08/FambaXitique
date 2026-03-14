const { User, Subscription, Plan } = require('../src/models');
const sequelize = require('../src/config/database');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Bot: Conectado à base de dados para migração...');
    
    const freePlan = await Plan.findOne({ where: { name: 'Grátis' } });
    if (!freePlan) {
      console.error('Plano Grátis não encontrado. Rode o setup-db primeiro.');
      process.exit(1);
    }

    const users = await User.findAll();
    console.log(`Migrando ${users.length} usuários...`);
    
    for (const user of users) {
      const existing = await Subscription.findOne({ where: { userId: user.id, status: 'active' } });
      if (!existing) {
        await Subscription.create({
          userId: user.id,
          planId: freePlan.id,
          status: 'active',
          endDate: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000)
        });
        console.log(`Assinalado plano Grátis ao usuário: ${user.phone}`);
      }
    }
    console.log('Migração concluída com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('Erro na migração:', err);
    process.exit(1);
  }
}

migrate();
