const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

function readIndicatorsConfig() {
  const declarationStart = source.indexOf("const INDICATORS_CONFIG =");
  const objectStart = source.indexOf("{", declarationStart);
  const objectEnd = source.indexOf("\n};", objectStart);

  assert.notEqual(declarationStart, -1);
  assert.notEqual(objectStart, -1);
  assert.notEqual(objectEnd, -1);

  return vm.runInNewContext(`(${source.slice(objectStart, objectEnd + 2)})`);
}

const indicators = readIndicatorsConfig();

test("configura os três domínios e o total", () => {
  assert.deepEqual(Object.keys(indicators), [
    "memoria",
    "atencao_percepcao",
    "acao_controle_executivo_acoes",
    "total"
  ]);

  assert.deepEqual([...indicators.memoria.questions], ["2", "6", "12", "16", "17", "20", "22", "23"]);
  assert.deepEqual([...indicators.atencao_percepcao.questions], [
    "1", "3", "4", "7", "8", "9", "13", "14", "18", "19", "21"
  ]);
  assert.deepEqual([...indicators.acao_controle_executivo_acoes.questions], [
    "5", "10", "11", "15", "24", "25"
  ]);
});

test("os domínios cobrem os 25 itens uma única vez", () => {
  const domainItems = [
    ...indicators.memoria.questions,
    ...indicators.atencao_percepcao.questions,
    ...indicators.acao_controle_executivo_acoes.questions
  ];
  const expectedItems = Array.from({ length: 25 }, (_, index) => String(index + 1));

  assert.equal(domainItems.length, 25);
  assert.equal(new Set(domainItems).size, 25);
  assert.deepEqual([...domainItems].sort((a, b) => Number(a) - Number(b)), expectedItems);
  assert.deepEqual([...indicators.total.questions], expectedItems);
});

test("calcula as quatro somas com a pontuação de 0 a 4", () => {
  const scores = Object.fromEntries(
    Array.from({ length: 25 }, (_, index) => [String(index + 1), index % 5])
  );
  const sum = (items) => items.reduce((total, item) => total + scores[item], 0);

  assert.deepEqual({
    memoria: sum(indicators.memoria.questions),
    atencao_percepcao: sum(indicators.atencao_percepcao.questions),
    acao_controle_executivo_acoes: sum(indicators.acao_controle_executivo_acoes.questions),
    total: sum(indicators.total.questions)
  }, {
    memoria: 10,
    atencao_percepcao: 21,
    acao_controle_executivo_acoes: 19,
    total: 50
  });
});

test("envia para results_meta somente as somas dos indicadores", () => {
  assert.match(
    source,
    /const resultsMetaPayload = Object\.fromEntries\([\s\S]*indicator\.sum[\s\S]*\);/
  );
  assert.match(source, /results: resultsPayload/);
  assert.match(source, /results_meta: resultsMetaPayload/);
});
