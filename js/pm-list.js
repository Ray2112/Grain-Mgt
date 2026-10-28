/* Lista de manutenção preventiva (Secção de silos — Grain-Mgt). GERADO por scripts/gen_pm_lists.js; não editar à mão.
 * Fonte: "Silos Section - Prevention.xlsx" (Zhax, 28-10-2026). Uma tarefa por activo e frequência (Mensal 1, Trimestral 3, Semestral 6, Anual 12 meses).
 * Repetições retiradas: Silos Section - Prevention.xlsx / Mechanical linha 9: SLC0002-M (já em Mechanical linha 8); Silos Section - Prevention.xlsx / Mechanical linha 36: SLC0007-M (já em Mechanical linha 34). */
(function (root) {
  'use strict';
  const SOURCE = "Silos Section - Prevention.xlsx (Zhax, 28-10-2026)";
  const TASKS = [
    {"id":"SLC0070-T","code":"SLC0070","asset":"Balança (BA04) - Alimentação Moagem","task":"Balança","freq":"trimestral","months":3,"group":"Balanças"},
    {"id":"SLC0069-T","code":"SLC0069","asset":"Balança (BA03) - Alimentação Moagem","task":"Balança","freq":"trimestral","months":3,"group":"Balanças"},
    {"id":"SLC0021-T","code":"SLC0021","asset":"Balança (BA02) - Recepcão 2","task":"Balança","freq":"trimestral","months":3,"group":"Balanças"},
    {"id":"SLC0010-T","code":"SLC0010","asset":"Balança (BA01) - Recepcão 1","task":"Balança","freq":"trimestral","months":3,"group":"Balanças"},
    {"id":"SLC0070-M","code":"SLC0070","asset":"Balança (BA04) - Alimentação Moagem","task":"Balança","freq":"mensal","months":1,"group":"Balanças"},
    {"id":"SLC0069-M","code":"SLC0069","asset":"Balança (BA03) - Alimentação Moagem","task":"Balança","freq":"mensal","months":1,"group":"Balanças"},
    {"id":"SLC0021-M","code":"SLC0021","asset":"Balança (BA02) - Recepcão 2","task":"Balança","freq":"mensal","months":1,"group":"Balanças"},
    {"id":"SLC0010-M","code":"SLC0010","asset":"Balança (BA01) - Recepcão 1","task":"Balança","freq":"mensal","months":1,"group":"Balanças"},
    {"id":"SLC0062-T","code":"SLC0062","asset":"Elevador (EL06) - Alimentação Moagem","task":"Elevador de Alcatruzes","freq":"trimestral","months":3,"group":"Mecânico"},
    {"id":"SLC0061-T","code":"SLC0061","asset":"Elevador (EL05) - Alimentação Moagem","task":"Elevador de Alcatruzes","freq":"trimestral","months":3,"group":"Mecânico"},
    {"id":"SLC0022-T","code":"SLC0022","asset":"Elevador (EL04) - Recepcão 2","task":"Elevador de Alcatruzes","freq":"trimestral","months":3,"group":"Mecânico"},
    {"id":"SLC0013-T","code":"SLC0013","asset":"Elevador (EL02) - Recepcão 2","task":"Elevador de Alcatruzes","freq":"trimestral","months":3,"group":"Mecânico"},
    {"id":"SLC0011-T","code":"SLC0011","asset":"Elevador (EL03) - Recepcão 1","task":"Elevador de Alcatruzes","freq":"trimestral","months":3,"group":"Mecânico"},
    {"id":"SLC0002-T","code":"SLC0002","asset":"Elevador (EL01) - Recepcão 1","task":"Elevador de Alcatruzes","freq":"trimestral","months":3,"group":"Mecânico"},
    {"id":"SLC0002-M","code":"SLC0002","asset":"Elevador (EL01) - Recepcão 1","task":"Elevador de Alcatruzes","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0064-M","code":"SLC0064","asset":"Ventilador (VE08) - Alimentação Moagem","task":"Ventilador de Extração","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0063-M","code":"SLC0063","asset":"Ventilador (VE07) - Alimentação Moagem","task":"Ventilador de Extração","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0016-M","code":"SLC0016","asset":"Ventilador Extração (VE06) - Recepcão 2","task":"Ventilador de Extração","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0015-M","code":"SLC0015","asset":"Ventilador Extração (VE05) - Recepcão 2","task":"Ventilador de Extração","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0014-M","code":"SLC0014","asset":"Ventilador Extração (VE04) - Recepcão 2","task":"Ventilador de Extração","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0005-M","code":"SLC0005","asset":"Ventilador Extração (VE03) - Recepcão 1","task":"Ventilador de Extração","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0004-M","code":"SLC0004","asset":"Ventilador Extração (VE02) - Recepcão 1","task":"Ventilador de Extração","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0003-M","code":"SLC0003","asset":"Ventilador Extração (VE01) - Recepcão 1","task":"Ventilador de Extração","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0019-A","code":"SLC0019","asset":"Separador Magnético de Metais (MA02) - Recepcão 2","task":"Detector Metais","freq":"anual","months":12,"group":"Mecânico"},
    {"id":"SLC0008-A","code":"SLC0008","asset":"Separador Magnético de Metais (MA01) - Recepcão 1","task":"Detector Metais","freq":"anual","months":12,"group":"Mecânico"},
    {"id":"SLC0019-M","code":"SLC0019","asset":"Separador Magnético de Metais (MA02) - Recepcão 2","task":"Detector Metais","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0008-M","code":"SLC0008","asset":"Separador Magnético de Metais (MA01) - Recepcão 1","task":"Detector Metais","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0066-S","code":"SLC0066","asset":"Eclusa (EC04) - Alimentação Moagem","task":"Eclusa","freq":"semestral","months":6,"group":"Mecânico"},
    {"id":"SLC0065-S","code":"SLC0065","asset":"Eclusa (EC03) - Alimentação Moagem","task":"Eclusa","freq":"semestral","months":6,"group":"Mecânico"},
    {"id":"SLC0017-S","code":"SLC0017","asset":"Eclusa (C02) - Recepcão 2","task":"Eclusa","freq":"semestral","months":6,"group":"Mecânico"},
    {"id":"SLC0006-T","code":"SLC0006","asset":"Eclusa (C01) - Recepcão 1","task":"Eclusa","freq":"trimestral","months":3,"group":"Mecânico"},
    {"id":"SLC0066-M","code":"SLC0066","asset":"Eclusa (EC04) - Alimentação Moagem","task":"Eclusa","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0065-M","code":"SLC0065","asset":"Eclusa (EC03) - Alimentação Moagem","task":"Eclusa","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0006-M","code":"SLC0006","asset":"Eclusa (C01) - Recepcão 1","task":"Eclusa","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0017-M","code":"SLC0017","asset":"Eclusa (C02) - Recepcão 2","task":"Eclusa","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0007-M","code":"SLC0007","asset":"Silo de Filtragem (FI03) - Recepcão 1","task":"Silo de Filtragem","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0018-M","code":"SLC0018","asset":"Silo de Filtragem (FI06) - Recepcão 2","task":"Silo de Filtragem","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0080-M","code":"SLC0080","asset":"Valvula Tripla (VT04)-REVOLTEIO","task":"Valvula Tripla","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0077-M","code":"SLC0077","asset":"Valvula Tripla (VT03)-REVOLTEIO","task":"Valvula Tripla","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0074-M","code":"SLC0074","asset":"Valvula Tripla (VT02)-Recepção 2","task":"Valvula Tripla","freq":"mensal","months":1,"group":"Mecânico"},
    {"id":"SLC0072-M","code":"SLC0072","asset":"Valvula Tripla (VT01)-Recepção 1","task":"Valvula Tripla","freq":"mensal","months":1,"group":"Mecânico"}
  ];
  const api = { SOURCE, TASKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PmList = api;
})(typeof window !== 'undefined' ? window : this);
