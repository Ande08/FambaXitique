const { Group, Membership, Invoice, User } = require('./src/models');

async function createTestInvoices() {
  try {
    const groupId = '35102e30-df1d-4a49-828c-9638196dbbc2';
    const group = await Group.findByPk(groupId);
    
    if (!group) {
        console.error('Group not found');
        process.exit(1);
    }

    // Ensure contribution amount is set
    group.contributionAmount = 500; // MT
    group.dueDay = 15;
    await group.save();

    const memberships = await Membership.findAll({ where: { GroupId: groupId } });
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    console.log(`Generating invoices for ${month}/${year}...`);

    for (const m of memberships) {
        const [invoice, created] = await Invoice.findOrCreate({
            where: { 
                userId: m.UserId, 
                groupId: groupId, 
                month, 
                year 
            },
            defaults: {
                amount: group.contributionAmount,
                dueDate: new Date(year, now.getMonth(), group.dueDay),
                status: 'pending'
            }
        });

        if (created) {
            console.log(`Created invoice for User ${m.UserId}`);
        } else {
            console.log(`Invoice already exists for User ${m.UserId}`);
        }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestInvoices();
