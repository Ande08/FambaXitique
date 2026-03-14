const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generateReceipt = async (payment, user, group) => {
    return new Promise((resolve, reject) => {
        try {
            const receiptName = `receipt_${payment.id}.pdf`;
            const receiptDir = path.join(__dirname, '../../uploads/receipts');
            
            if (!fs.existsSync(receiptDir)) {
                fs.mkdirSync(receiptDir, { recursive: true });
            }

            const receiptPath = path.join(receiptDir, receiptName);
            const doc = new PDFDocument({ margin: 50 });

            const stream = fs.createWriteStream(receiptPath);
            doc.pipe(stream);

            // Header
            doc.fontSize(20).text('FambaXitique', { align: 'center' }).moveDown();
            doc.fontSize(14).text('RECIBO DE PAGAMENTO', { align: 'center', underline: true }).moveDown(2);

            // Transaction Info
            doc.fontSize(10).font('Helvetica-Bold').text('DETALHES DA TRANSAÇÃO');
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);
            
            doc.font('Helvetica').text(`ID da Transação: ${payment.transactionId || 'N/A'}`);
            doc.text(`Data: ${new Date(payment.updatedAt).toLocaleString()}`);
            doc.text(`Grupo: ${group.name}`);
            doc.text(`Membro: ${user.firstName} ${user.lastName}`);
            doc.moveDown();

            // Financial Info
            doc.fontSize(12).font('Helvetica-Bold').text(`VALOR PAGO: ${payment.amount} MT`, { color: '#28a745' });
            doc.moveDown();

            // Context
            let type = 'Contribuição';
            if (payment.loanId) type = 'Amortização de Empréstimo';
            
            doc.fontSize(10).font('Helvetica-Bold').text('FINALIDADE:');
            doc.font('Helvetica').text(type);
            
            if (payment.Invoice) {
                doc.text(`Referente à fatura de: ${payment.Invoice.month}/${payment.Invoice.year}`);
            }
            
            if (payment.notes) {
                doc.moveDown();
                doc.font('Helvetica-Bold').text('Notas:');
                doc.font('Helvetica').text(payment.notes);
            }

            // Footer
            doc.moveDown(4);
            doc.fontSize(8).fillColor('#6c757d').text('Este é um recibo gerado automaticamente pelo sistema FambaXitique.', { align: 'center' });
            doc.text(`Validado digitalmente em ${new Date().toLocaleDateString()}`, { align: 'center' });

            doc.end();

            stream.on('finish', () => {
                resolve(`uploads/receipts/${receiptName}`);
            });

            stream.on('error', (err) => {
                reject(err);
            });

        } catch (error) {
            reject(error);
        }
    });
};
