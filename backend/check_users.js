const { User } = require('./src/models');
const sequelize = require('./src/config/database');

async function checkUsers() {
  try {
    await sequelize.authenticate();
    const users = await User.findAll({ attributes: ['id', 'firstName', 'phone', 'role'] });
    console.log('--- USERS IN DB ---');
    users.forEach(u => {
      console.log(`${u.firstName} | ${u.phone} | ${u.role}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
