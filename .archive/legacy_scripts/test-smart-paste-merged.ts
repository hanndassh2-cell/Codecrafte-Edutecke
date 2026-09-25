import { cleanAndConvertHtml } from "./src/services/smartPasteEngine";

const html = `
<table class="MsoTableGrid" border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:none">
 <tbody>
  <tr>
   <td width="301" colspan="2" rowspan="2" valign="top" style="width:225.55pt;border:solid windowtext 1.0pt;padding:0cm 5.4pt 0cm 5.4pt">
    <p class="MsoNormal" align="right" style="text-align:right">
     <span dir="RTL" lang="AR-EG">نص عربي</span>
    </p>
   </td>
   <td width="301" valign="top" style="width:225.55pt;border:solid windowtext 1.0pt;padding:0cm 5.4pt 0cm 5.4pt">
    <p class="MsoNormal" align="right" style="text-align:right">
     <span dir="LTR">English Text</span>
    </p>
   </td>
  </tr>
 </tbody>
</table>
`;

async function run() {
  const result = await cleanAndConvertHtml(html, "", null);
  console.log(result.html);
}

run();
