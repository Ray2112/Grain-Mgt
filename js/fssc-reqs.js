/* Registo de requisitos FSSC 22000 (v7.0, Maio 2026) para a FMO Moagem de Milho — categoria CIV (produtos estáveis à
 * temperatura ambiente; a farinha é exemplo da categoria no Esquema, Parte 1 §3.2). Ficheiro igual na Prodn-Mgt e na Grain-Mgt.
 * Normas auditadas (Parte 2 §2.1, Tabela 1): ISO 22000:2018, ISO 22002-1:2025 e ISO 22002-100:2025 (PRP) e os requisitos
 * adicionais FSSC (Parte 2 §2.5). Títulos resumidos por FMIP (não são o texto das normas).
 * - ISO 22000: estrutura de cláusulas da norma de 2018 (conferir com a norma; não foi fornecida).
 * - PRP: temas da ISO 22002-1/-100 sem número de cláusula (as edições de 2025 não foram fornecidas; números a acrescentar).
 * - §2.5: do documento do Esquema v7.0 (FSSC-22000-Scheme-Version-7.pdf, enviado por Zhax a 28-10-2026).
 * Campos: id, sec (secção), ref (referência na norma), pt/en (título), doc (exige informação documentada),
 * area ('both' | 'mill' Prodn-Mgt | 'grain' Grain-Mgt), na (texto: quando pode ser N/A). */
(function (root) {
  'use strict';
  const SOURCE = 'FSSC 22000 Scheme v7.0 (Maio 2026), Parte 2 §2.3–2.5; categoria CIV';
  const SECTIONS = [
    ['iso4', 'ISO 22000 — 4 Contexto', 'ISO 22000 — 4 Context'],
    ['iso5', 'ISO 22000 — 5 Liderança', 'ISO 22000 — 5 Leadership'],
    ['iso6', 'ISO 22000 — 6 Planeamento', 'ISO 22000 — 6 Planning'],
    ['iso7', 'ISO 22000 — 7 Suporte', 'ISO 22000 — 7 Support'],
    ['iso8', 'ISO 22000 — 8 Operação', 'ISO 22000 — 8 Operation'],
    ['iso9', 'ISO 22000 — 9 Avaliação do desempenho', 'ISO 22000 — 9 Performance evaluation'],
    ['iso10', 'ISO 22000 — 10 Melhoria', 'ISO 22000 — 10 Improvement'],
    ['prp', 'Programas de pré-requisitos (ISO 22002-1 / 22002-100)', 'Prerequisite programmes (ISO 22002-1 / 22002-100)'],
    ['fssc', 'Requisitos adicionais FSSC 22000 (§2.5)', 'FSSC 22000 additional requirements (§2.5)']
  ];
  const R = (id, sec, ref, pt, en, doc, area, na) => ({ id, sec, ref, pt, en, doc: !!doc, area: area || 'both', na: na || '' });
  const REQS = [
    R('ISO-4.1', 'iso4', '4.1–4.2', 'Contexto da organização e partes interessadas identificados', 'Context of the organization and interested parties identified', 0),
    R('ISO-4.3', 'iso4', '4.3', 'Âmbito do SGSA definido (produtos, processos, local)', 'FSMS scope defined (products, processes, site)', 1),
    R('ISO-4.4', 'iso4', '4.4', 'SGSA estabelecido, implementado e mantido', 'FSMS established, implemented and maintained', 0),
    R('ISO-5.1', 'iso5', '5.1', 'Compromisso da direcção com o SGSA', 'Top management commitment to the FSMS', 0),
    R('ISO-5.2', 'iso5', '5.2', 'Política de segurança alimentar aprovada e comunicada', 'Food safety policy approved and communicated', 1),
    R('ISO-5.3', 'iso5', '5.3', 'Funções, responsabilidades e autoridades; líder da equipa de segurança alimentar', 'Roles, responsibilities and authorities; food safety team leader', 1),
    R('ISO-6.1', 'iso6', '6.1', 'Riscos e oportunidades do SGSA tratados', 'FSMS risks and opportunities addressed', 1),
    R('ISO-6.2', 'iso6', '6.2', 'Objectivos de segurança alimentar com metas e seguimento', 'Food safety objectives with targets and follow-up', 1),
    R('ISO-6.3', 'iso6', '6.3', 'Alterações ao SGSA planeadas', 'Changes to the FSMS planned', 0),
    R('ISO-7.1', 'iso7', '7.1.2–7.1.5', 'Recursos: pessoas, infra-estrutura, ambiente de trabalho, elementos externos', 'Resources: people, infrastructure, work environment, external elements', 0),
    R('ISO-7.1.6', 'iso7', '7.1.6', 'Controlo de fornecedores externos (avaliação, selecção, acompanhamento)', 'Control of external providers (evaluation, selection, monitoring)', 1),
    R('ISO-7.2', 'iso7', '7.2', 'Competência: requisitos, formação e registos', 'Competence: requirements, training and records', 1),
    R('ISO-7.3', 'iso7', '7.3', 'Consciencialização do pessoal', 'Personnel awareness', 0),
    R('ISO-7.4', 'iso7', '7.4', 'Comunicação externa e interna', 'External and internal communication', 1),
    R('ISO-7.5', 'iso7', '7.5', 'Controlo da informação documentada (aprovação, versões, acesso, retenção)', 'Control of documented information (approval, versions, access, retention)', 1),
    R('ISO-8.1', 'iso8', '8.1', 'Planeamento e controlo operacional', 'Operational planning and control', 0),
    R('ISO-8.2', 'iso8', '8.2', 'PRP estabelecidos e documentados (ver secção PRP)', 'PRPs established and documented (see PRP section)', 1),
    R('ISO-8.3', 'iso8', '8.3', 'Sistema de rastreabilidade, com teste de rastreabilidade', 'Traceability system, with traceability test', 1),
    R('ISO-8.4', 'iso8', '8.4', 'Preparação e resposta a emergências (inclui testes)', 'Emergency preparedness and response (incl. tests)', 1),
    R('ISO-8.5.1', 'iso8', '8.5.1', 'Passos preliminares: equipa, características das matérias-primas e produtos, uso previsto, fluxogramas verificados', 'Preliminary steps: team, raw material and product characteristics, intended use, verified flow diagrams', 1),
    R('ISO-8.5.2', 'iso8', '8.5.2', 'Análise de perigos (identificação, avaliação, selecção de medidas de controlo)', 'Hazard analysis (identification, assessment, selection of control measures)', 1),
    R('ISO-8.5.3', 'iso8', '8.5.3', 'Validação das medidas de controlo', 'Validation of control measures', 1),
    R('ISO-8.5.4', 'iso8', '8.5.4', 'Plano de controlo de perigos (PCC / PPRO): limites, monitorização, acções', 'Hazard control plan (CCP / OPRP): limits, monitoring, actions', 1),
    R('ISO-8.6', 'iso8', '8.6', 'Actualização da informação dos PRP e do plano de controlo de perigos', 'Update of PRP information and hazard control plan', 0),
    R('ISO-8.7', 'iso8', '8.7', 'Controlo da monitorização e medição (calibração)', 'Control of monitoring and measuring (calibration)', 1),
    R('ISO-8.8', 'iso8', '8.8', 'Verificação dos PRP e do plano de controlo de perigos; análise dos resultados', 'Verification of PRPs and hazard control plan; analysis of results', 1),
    R('ISO-8.9', 'iso8', '8.9', 'Não conformidades: correcções, acções correctivas, produto potencialmente inseguro, retirada/recolha', 'Nonconformities: corrections, corrective actions, potentially unsafe product, withdrawal/recall', 1),
    R('ISO-9.1', 'iso9', '9.1', 'Monitorização, medição, análise e avaliação', 'Monitoring, measurement, analysis and evaluation', 0),
    R('ISO-9.2', 'iso9', '9.2', 'Auditoria interna: programa, auditores independentes, relatórios', 'Internal audit: programme, independent auditors, reports', 1),
    R('ISO-9.3', 'iso9', '9.3', 'Revisão pela direcção com as entradas e saídas exigidas', 'Management review with the required inputs and outputs', 1),
    R('ISO-10.1', 'iso10', '10.1', 'Não conformidade e acção correctiva (causa, eficácia)', 'Nonconformity and corrective action (cause, effectiveness)', 1),
    R('ISO-10.2', 'iso10', '10.2–10.3', 'Melhoria contínua e actualização do SGSA', 'Continual improvement and FSMS update', 0),
    R('PRP-BLD', 'prp', 'ISO 22002-1', 'Construção, instalações e layout (fluxos, zonas, superfícies)', 'Construction, premises and layout (flows, zones, surfaces)', 1),
    R('PRP-UTL', 'prp', 'ISO 22002-1', 'Utilidades: água, ar, vapor, iluminação, ventilação', 'Utilities: water, air, steam, lighting, ventilation', 1),
    R('PRP-WST', 'prp', 'ISO 22002-1', 'Resíduos e drenagem', 'Waste and drains', 1),
    R('PRP-EQP', 'prp', 'ISO 22002-1', 'Equipamento: adequação, limpeza e manutenção preventiva', 'Equipment: suitability, cleaning and preventive maintenance', 1),
    R('PRP-PUR', 'prp', 'ISO 22002-1', 'Materiais comprados: aprovação de fornecedores, recepção, especificações', 'Purchased materials: supplier approval, receipt, specifications', 1),
    R('PRP-XCN', 'prp', 'ISO 22002-1', 'Prevenção de contaminação cruzada (física, química, microbiológica, alergénios)', 'Prevention of cross-contamination (physical, chemical, microbiological, allergens)', 1),
    R('PRP-CLN', 'prp', 'ISO 22002-1', 'Limpeza e higienização (programas, químicos, verificação)', 'Cleaning and sanitizing (programmes, chemicals, verification)', 1),
    R('PRP-PST', 'prp', 'ISO 22002-1', 'Controlo de pragas (contrato, mapa de iscos, relatórios, tendências)', 'Pest control (contract, bait map, reports, trends)', 1),
    R('PRP-HYG', 'prp', 'ISO 22002-1', 'Higiene pessoal, instalações do pessoal e vestuário', 'Personal hygiene, staff facilities and clothing', 1),
    R('PRP-RWK', 'prp', 'ISO 22002-1', 'Reprocessamento (identificação, rastreabilidade, uso)', 'Rework (identification, traceability, use)', 1, 'mill'),
    R('PRP-RCL', 'prp', 'ISO 22002-1', 'Procedimento de retirada/recolha de produto, com teste', 'Product withdrawal/recall procedure, with test', 1),
    R('PRP-WHS', 'prp', 'ISO 22002-1', 'Armazenagem (condições, separação, FIFO)', 'Warehousing (conditions, segregation, FIFO)', 1),
    R('PRP-INF', 'prp', 'ISO 22002-1', 'Informação do produto e consciencialização do consumidor', 'Product information and consumer awareness', 0, 'mill'),
    R('PRP-HLT', 'prp', 'ISO 22002-100', 'Estado de saúde e exames do pessoal', 'Personnel health status and examinations', 1),
    R('F-2.5.1a', 'fssc', '§2.5.1 a', 'Análises críticas feitas por laboratório competente (ISO/IEC 17025 ou ensaios interlaboratoriais)', 'Critical analyses done by a competent laboratory (ISO/IEC 17025 or proficiency testing)', 1),
    R('F-2.5.1b', 'fssc', '§2.5.1 b', 'Procedimento de compras em situação de emergência', 'Emergency procurement procedure', 1),
    R('F-2.5.1c', 'fssc', '§2.5.1 c', 'Política de compra de animais, peixe e marisco com substâncias proibidas', 'Procurement policy for animals, fish and seafood with prohibited substances', 1, 'both', 'N/A se não houver matérias-primas animais'),
    R('F-2.5.1d', 'fssc', '§2.5.1 d', 'Revisão periódica das especificações de matérias-primas e produto acabado', 'Periodic review of raw material and finished product specifications', 1),
    R('F-2.5.2a', 'fssc', '§2.5.2 a', 'Rotulagem conforme a lei do país de venda (incl. alergénios e cliente)', 'Labelling per the law of the country of sale (incl. allergens and customer)', 1, 'mill'),
    R('F-2.5.2b', 'fssc', '§2.5.2 b', 'Produto sem rótulo: informação disponível ao cliente', 'Unlabelled product: information available to the customer', 0, 'both', 'N/A se todo o produto for rotulado'),
    R('F-2.5.2c', 'fssc', '§2.5.2 c', 'Alegações no rótulo validadas e verificadas (rastreabilidade e balanço de massas)', 'Label claims validated and verified (traceability and mass balance)', 1, 'mill', 'N/A se não houver alegações'),
    R('F-2.5.2d', 'fssc', '§2.5.2 d', 'Gestão de artes e controlo de impressão (aprovação, alterações, tiragens, erros, variantes, sobras)', 'Artwork management and print control (approval, changes, runs, errors, variants, surplus)', 1, 'mill', 'N/A se a organização não imprimir rótulos/embalagens'),
    R('F-2.5.3', 'fssc', '§2.5.3', 'Avaliação de ameaças e plano de defesa alimentar (pessoal competente, actualizado)', 'Food defence threat assessment and plan (competent personnel, up to date)', 1),
    R('F-2.5.4', 'fssc', '§2.5.4', 'Avaliação de vulnerabilidade e plano de mitigação de fraude alimentar', 'Food fraud vulnerability assessment and mitigation plan', 1),
    R('F-2.5.5', 'fssc', '§2.5.5', 'Uso do logótipo FSSC só em marketing (nunca no produto, embalagem ou certificados de análise)', 'FSSC logo used only in marketing (never on product, packaging or CoAs)', 0, 'both', 'N/A antes da certificação'),
    R('F-2.5.6ad', 'fssc', '§2.5.6 a–d', 'Plano de gestão de alergénios: lista, avaliação de risco, controlos, validação e verificação', 'Allergen management plan: list, risk assessment, controls, validation and verification', 1),
    R('F-2.5.6ef', 'fssc', '§2.5.6 e–f', 'Rotulagem preventiva só com base no risco; formação de todo o pessoal em alergénios', 'Precautionary labelling only on risk; allergen training for all personnel', 1),
    R('F-2.5.6g', 'fssc', '§2.5.6 g', 'Revisão anual do plano de alergénios (e após alterações, recolhas ou tendências)', 'Annual review of the allergen plan (and after changes, recalls or trends)', 1),
    R('F-2.5.7ab', 'fssc', '§2.5.7 a–b', 'Programa de monitorização ambiental baseado no risco; procedimento de avaliação da eficácia', 'Risk-based environmental monitoring programme; effectiveness evaluation procedure', 1),
    R('F-2.5.7cd', 'fssc', '§2.5.7 c–d', 'Dados e tendências da monitorização ambiental; revisão anual do programa', 'Environmental monitoring data and trends; annual programme review', 1),
    R('F-2.5.8', 'fssc', '§2.5.8', 'Cultura de segurança e qualidade alimentar: objectivos, plano com metas e prazos, compromisso do pessoal', 'Food safety and quality culture: objectives, plan with targets and timelines, personnel commitment', 1),
    R('F-2.5.9a', 'fssc', '§2.5.9 a', 'Política e objectivos da qualidade; parâmetros de qualidade e libertação; análise na revisão pela direcção; qualidade na auditoria interna', 'Quality policy and objectives; quality parameters and release; analysis in management review; quality in internal audit', 1),
    R('F-2.5.9b', 'fssc', '§2.5.9 b', 'Controlo de quantidade (peso) e calibração/verificação do equipamento', 'Quantity (weight) control and calibration/verification of equipment', 1),
    R('F-2.5.9c', 'fssc', '§2.5.9 c', 'Arranque de linha e mudança de produto (remoção de embalagens e rótulos anteriores)', 'Line start-up and changeover (removal of previous packaging and labels)', 1, 'mill'),
    R('F-2.5.10a', 'fssc', '§2.5.10 a', 'Gestão de stocks com rotação FEFO/FIFO', 'Stock management with FEFO/FIFO rotation', 1),
    R('F-2.5.10c', 'fssc', '§2.5.10 c', 'Cisternas: plano de limpeza baseado no risco; acordo com fornecedores', 'Tankers: risk-based cleaning plan; supplier agreement', 1, 'both', 'N/A se não forem usadas cisternas'),
    R('F-2.5.11a', 'fssc', '§2.5.11 a', 'Requisitos para embalagem com efeito funcional no alimento', 'Requirements for packaging with a functional effect on food', 0, 'mill', 'N/A se a embalagem não tiver efeito funcional'),
    R('F-2.5.11d1', 'fssc', '§2.5.11 d i', 'Avaliação de risco para equipamento de detecção de corpos estranhos (ímanes, peneiros, detectores)', 'Risk assessment for foreign body detection equipment (magnets, sieves, detectors)', 1),
    R('F-2.5.11d2', 'fssc', '§2.5.11 d ii', 'Procedimento de gestão e uso do equipamento de detecção', 'Procedure for management and use of detection equipment', 1),
    R('F-2.5.11d3', 'fssc', '§2.5.11 d iii', 'Controlo de corpos estranhos e gestão de quebras (metal, vidro, plástico duro)', 'Foreign matter control and breakage management (metal, glass, hard plastic)', 1),
    R('F-2.5.12', 'fssc', '§2.5.12', 'Inspecções regulares ao local / verificação dos PRP (ex.: mensais), baseadas no risco', 'Regular site inspections / PRP checks (e.g. monthly), risk-based', 1),
    R('F-2.5.13', 'fssc', '§2.5.13 a–e', 'Concepção e desenvolvimento de produto: impacto no SGSA, fluxo, recursos, equipamento, ensaios e vida útil', 'Product design and development: FSMS impact, flow, resources, equipment, trials and shelf life', 1, 'mill'),
    R('F-2.5.15a', 'fssc', '§2.5.15 a', 'Especificação de compra de equipamento (desenho higiénico, uso previsto)', 'Equipment purchase specification (hygienic design, intended use)', 1),
    R('F-2.5.15b', 'fssc', '§2.5.15 b', 'Gestão de alterações de equipamento com comissionamento documentado', 'Equipment change management with documented commissioning', 1),
    R('F-2.5.16', 'fssc', '§2.5.16', 'Perdas e desperdício alimentar: política, objectivos com metas, doações, subprodutos para ração', 'Food loss and waste: policy, objectives with targets, donations, by-products to feed', 1),
    R('F-2.5.17', 'fssc', '§2.5.17', 'Comunicação ao organismo de certificação em 3 dias úteis (eventos graves)', 'Notification of the certification body within 3 working days (serious events)', 1)
  ];
  const api = { SOURCE, SECTIONS, REQS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FsscReqs = api;
})(typeof window !== 'undefined' ? window : this);
