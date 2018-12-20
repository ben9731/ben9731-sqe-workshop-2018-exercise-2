import assert from 'assert';
import {parseCode} from '../src/js/code-analyzer';

describe('The javascript parser', () => {
    let vars = new Map();
    vars.set('x', {type: 'Literal', value: 1, raw: '1'});
    vars.set('y', {type: 'Literal', value: 2, raw: '2'});
    vars.set('z', {type: 'Literal', value: 3, raw: '3'});
    it('is parsing an empty function correctly', () => {assert.equal(parseCode('', vars), '');});
    it('test #1', () => {assert.equal(parseCode('function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +
        '    if (b < z) {\n' +
        '        c = c + 5;\n' +
        '        return x + y + z + c;\n' +
        '    } else if (b < z * 2) {\n' +
        '        c = c + x + 5;\n' +
        '        return x + y + z + c;\n' +
        '    } else {\n' +
        '        c = c + z + 5;\n' +
        '        return x + y + z + c;\n' +
        '    }\n' +
        '}\n', vars), 'function foo(x, y, z) {\n' +
        '    if (<red>x + 1 + y < z</red>) {\n' +
        '        return x + y + z + (0 + 5);\n' +
        '    } else if (<green>x + 1 + y < z * 2</green>) {\n' +
        '        return x + y + z + (0 + x + 5);\n' +
        '    } else {\n' +
        '        return x + y + z + (0 + z + 5);\n' +
        '    }\n' +
        '}');});
    it('test #2', () => {assert.equal(parseCode('function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +
        '    while (a < z) {\n' +
        '        c = a + b;\n' +
        '        z = c * 2;\n' +
        '    }\n' +
        '    \n' +
        '    return z;\n' +
        '}', vars), 'function foo(x, y, z) {\n' +
        '    while (x + 1 < z) {\n' +
        '        z = (x + 1 + (x + 1 + y)) * 2;\n' +
        '    }\n' +
        '    return z;\n' +
        '}');});
    it('test #3', () => {assert.equal(parseCode('function test(x,y,z){\n' +
        'let arr = [1, 2, 3];\n' +
        'arr[1] = 1;\n' +
        'let a = 2, b = 2;\n' +
        'a++, b++;\n' +
        '}', vars), 'function test(x, y, z) {\n' +
        '}');});
    it('test #4', () => {assert.equal(parseCode('function test(x,y,z){\n' +
        'let a = -x;\n' +
        'let b = -a;\n' +
        'b = b + 2;\n' +
        '}', vars), 'function test(x, y, z) {\n' +
        '}');});
    it('test #5', () => {assert.equal(parseCode('let t = 5;\n' +
        'function test(x,y,z){\n' +
        'let a = [1,2,3];\n' +
        'a[1+1] = 2;\n' +
        'a[1]--;\n' +
        'x++, y++;\n' +
        '}', vars), 'function test(x, y, z) {\n' +
        '    a[1] = a[1] - 1;\n' +
        '    x = x + 1, y = y + 1;\n' +
        '}');});
    it('test #6', () => {assert.equal(parseCode('function test(x,y,z){\n' +
        'x=3;\n' +
        'let a=0,b=0;\n' +
        'a++,b++;\n' +
        'let arr = [1];\n' +
        'arr[0];\n' +
        '}', vars), 'function test(x, y, z) {\n' +
        '    x = 3;\n' +
        '    arr[0];\n' +
        '}');});
    it('test #7', () => {assert.equal(parseCode('function test(x,y,z){\n' +
        'if (x>1){}\n' +
        'else if (x == 1){\n' +
        'x++;\n' +
        '}\n' +
        '}', vars), 'function test(x, y, z) {\n' +
        '    if (<green>x > 1</green>) {\n' +
        '    } else if (<red>x == 1</red>) {\n' +
        '        x = x + 1;\n' +
        '    }\n' +
        '}');});
    it('test #8', () => {assert.equal(parseCode('function test(x,y,z){\n' +
        'x = [1,2,3];\n' +
        'x[1] = 1;\n' +
        'x=1;\n' +
        '}', vars), 'function test(x, y, z) {\n' +
        '    x = [\n' +
        '        1,\n' +
        '        2,\n' +
        '        3\n' +
        '    ];\n' +
        '    x[1] = 1;\n' +
        '    x = 1;\n' +
        '}');});
    it('test #9', () => {assert.equal(parseCode('function test(x,y,z){\n' +
        'x=1;\n' +
        'y=2;\n' +
        'z=3;\n' +
        '}', vars), 'function test(x, y, z) {\n' +
        '    x = 1;\n' +
        '    y = 2;\n' +
        '    z = 3;\n' +
        '}');});
    it('test #10', () => {assert.equal(parseCode('function test(x,y,z){}', vars), 'function test(x, y, z) {\n' +
        '}');});
});