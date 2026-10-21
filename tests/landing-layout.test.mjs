import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const css=readFileSync(new URL("../styles/main.css",import.meta.url),"utf8");
test("landing sign has a reserved grid row above the shop door and windows",()=>{
  const sign=css.match(/\.store-sign\s*\{([^}]+)\}/)[1];
  assert.match(sign,/position:\s*relative/);
  assert.match(sign,/grid-column:\s*1\s*\/\s*-1/);
  assert.match(sign,/grid-row:\s*1/);
  const structure=css.match(/\.shop-window,\s*\.shop-door\s*\{([^}]+)\}/)[1];
  assert.match(structure,/grid-row:\s*2/);
  assert.match(css,/grid-template-rows:\s*auto 242px/);
  assert.match(css,/grid-template-rows:\s*auto 170px/);
});
test("no mobile sign override restores absolute positioning or overlap offsets",()=>{
  for(const match of css.matchAll(/\.store-sign\s*\{([^}]+)\}/g)){
    assert.doesNotMatch(match[1],/position:\s*absolute|\btop:|\btransform:/);
  }
});
