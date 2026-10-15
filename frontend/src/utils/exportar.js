// Exporta una tabla a un archivo que Excel abre directamente (tabla HTML con
// tipo de Excel). No necesita internet ni librerías: funciona en la estación.
const escapar = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const exportarExcel = (nombre, titulo, encabezados, filas) => {
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
<table border="1">
<tr><th colspan="${encabezados.length}" style="font-size:14px">${escapar(titulo)}</th></tr>
<tr>${encabezados.map(e => `<th style="background:#eee">${escapar(e)}</th>`).join('')}</tr>
${filas.map(f => `<tr>${f.map(c => `<td>${escapar(c)}</td>`).join('')}</tr>`).join('\n')}
</table></body></html>`;
    const url = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.xls`;
    a.click();
    URL.revokeObjectURL(url);
};
