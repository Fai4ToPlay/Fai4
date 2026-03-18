import ExcelJS from 'exceljs';

export async function analyzeExcelTemplate(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const sheets = wb.worksheets.map((sheet) => {
    const fields = [];
    sheet.eachRow((row, rowNum) => {
      row.eachCell((cell, colNum) => {
        if (typeof cell.value === 'string' && cell.value.includes(':')) {
          fields.push({ label: cell.value.trim(), row: rowNum, col: colNum });
        }
      });
    });
    return {
      name: sheet.name,
      rows: sheet.rowCount,
      columns: sheet.columnCount,
      fields
    };
  });

  return { sheets };
}

export async function exportActToExcel(act, defects = []) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Акт');
  ws.addRow(['Номер', act.act_number]);
  ws.addRow(['Тип', act.act_type]);
  ws.addRow(['Дата', act.act_date]);
  ws.addRow(['Объект', act.object_name || '']);
  ws.addRow([]);
  ws.addRow(['№', 'Описание', 'Локация', 'Ответственный', 'Срок']);
  defects.forEach((d, idx) => ws.addRow([idx + 1, d.description, d.location, d.responsible, d.due_date]));
  return wb.xlsx.writeBuffer();
}
