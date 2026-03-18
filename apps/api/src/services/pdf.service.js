import PDFDocument from 'pdfkit';

export function renderActPdf({ act, defects = [] }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(16).text('Акт', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Номер: ${act.act_number}`);
    doc.text(`Тип: ${act.act_type}`);
    doc.text(`Дата: ${act.act_date}`);
    doc.text(`Объект: ${act.object_name || ''}`);
    doc.moveDown();
    doc.text('Таблица дефектов:');
    defects.forEach((item, idx) => {
      doc.text(`${idx + 1}. ${item.description} | ${item.location || '-'} | ${item.responsible || '-'} | ${item.due_date || '-'}`);
    });
    doc.moveDown();
    doc.text('Подписи: ____________________');
    doc.end();
  });
}
