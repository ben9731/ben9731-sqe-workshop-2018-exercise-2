import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

let functionVariables;
let localVariables;
let change;

const parseCode = (codeToParse, vars) => {
    localVariables = new Map();
    functionVariables = vars;
    change = false;
    let first = parseCodeNew(esprima.parseScript(codeToParse));
    let str = escodegen.generate(first, {verbatim : 'paint'});
    return str;
};

const parseCodeNew = (codeToParse) => {
    if (codeToParse != null) {
        return typeFind(codeToParse.type)(codeToParse);
    }
    return null;
};

const parseProgram = (codeToParse) => {
    let code = codeToParse;
    let arr = [];
    codeToParse.body.forEach(function (element) {
        let temp = parseCodeNew(element);
        if (temp != null){
            arr.push(temp);
        }
    });
    code.body = arr;
    return code;
};

const parseFunctionDeclaration = (codeToParse) => {
    let code = codeToParse;
    code.body = parseCodeNew(codeToParse.body);
    return code;
};

const parseBlockStatement = (codeToParse) => {
    let code = codeToParse;
    let arr = [];
    codeToParse.body.forEach(function (element) {
        let temp = parseCodeNew(element);
        if (temp != null){
            arr.push(temp);
        }
    });
    code.body = arr;
    return code;
};

const parseVariableDeclaration = (codeToParse) => {
    let code = codeToParse;
    let i = 0;
    codeToParse.declarations.forEach(function (element) {
        let temp = substitute(element.init);
        localVariables.set(element.id.name, temp);
        code.declarations[i].init = temp;
        i++;
    });
    return null;
};

const parseExpressionStatement = (codeToParse) => {
    let code = codeToParse;
    code.expression = substitute(codeToParse.expression);
    if (code.expression === null){
        return null;
    }
    return code;
};

const parseWhileStatement = (codeToParse) => {
    let code = codeToParse;
    code.test = substitute(codeToParse.test);
    code.body = parseCodeNew(codeToParse.body);
    return code;
};

const parseIfStatement = (codeToParse) => {
    let tempFunc = new Map(functionVariables);
    let tempLoc = new Map(localVariables);
    let code = codeToParse;
    code.test = substitute(codeToParse.test);
    code = colorIf(codeToParse);
    code.consequent = parseCodeNew(codeToParse.consequent);
    functionVariables = tempFunc;
    localVariables = tempLoc;
    code.alternate = parseCodeNew(codeToParse.alternate);
    functionVariables = tempFunc;
    localVariables = tempLoc;
    return code;
};

const colorIf = (codeToParse) =>{
    let code = codeToParse;
    let str = escodegen.generate(codeToParse.test);
    let temp = esprima.parseScript(str);
    change = true;
    let str2 = escodegen.generate(parseCodeNew(temp));
    change = false;
    if (eval(str2))
        code.test.paint = '<green>' + escodegen.generate(code.test) + '</green>';
    else
        code.test.paint = '<red>' + escodegen.generate(code.test) + '</red>';
    return code;
};

const parseReturnStatement = (codeToParse) => {
    let code = codeToParse;
    code.argument = substitute(codeToParse.argument);
    return code;
};

const substitute = (expression) => {
    return substituteFind(expression.type)(expression);
};

const substituteLiteral = (expression) => {
    return expression;
};

const substituteIdentifier = (expression) => {
    if (functionVariables.has(expression.name)){
        if (change){
            return functionVariables.get(expression.name);
        }
        else {
            return expression;
        }
    }
    return localVariables.get(expression.name);
};

const substituteBinaryExpression = (expression) => {
    let exp = expression;
    exp.left = substitute(expression.left);
    exp.right = substitute(expression.right);
    return exp;
};

const substituteUnaryExpression = (expression) => {
    let exp = expression;
    exp.argument = substitute(expression.argument);
    return exp;
};

const substituteArrayExpression = (expression) => {
    let exp = expression;
    let elements = [];
    expression.elements.forEach(function (element) {
        elements.push(substitute(element));
    });
    exp.elements = elements;
    return exp;
};

const substituteMemberExpression = (expression) => {
    let exp = expression;
    exp.property = substitute(expression.property);
    return exp;
};

const substituteUpdateExpression = (expression) => {
    let operator = '-';
    if (expression.operator === '++'){
        operator = '+';
    }
    let arg;
    if (localVariables.has(expression.argument.name)){
        arg = localVariables.get(expression.argument.name);
        localVariables.set(expression.argument.name, {type : 'BinaryExpression', operator : operator, left : arg,
            right : {type : 'Literal', value : 1, raw : '1'}});
        return null;
    }
    else {
        arg = expression.argument;
        functionVariables.set(expression.argument.name, {type : 'BinaryExpression', operator : operator,
            left : functionVariables.get(arg.name), right : {type : 'Literal', value : 1, raw : '1'}});
    }
    return {type : 'AssignmentExpression', operator : '=', left : expression.argument, right : {type :
                'BinaryExpression', operator : operator, left : arg, right : {type : 'Literal', value : 1, raw : '1'}}};
};

const substituteSequenceExpression = (expression) => {
    let exp = expression;
    let expressions = [];
    expression.expressions.forEach(function (element) {
        let temp = substitute(element);
        if (temp != null)
            expressions.push(temp);
    });
    exp.expressions = expressions;
    if (expressions.length != 0){
        return exp;
    }
    return null;
};

const substituteAssignmentExpression = (expression) => {
    if (expression.left.type === 'MemberExpression'){
        return substituteAssignmentExpressionMember(expression);
    }
    else {
        let exp = expression;
        exp.right = substitute(expression.right);
        if (functionVariables.has(exp.left.name)){
            let temp = escodegen.generate(exp.right);
            change = true;
            functionVariables.set(exp.left.name, substitute(esprima.parseScript(temp).body[0].expression));
            change = false;
        }
        else {
            localVariables.set(exp.left.name, substitute(expression.right));
            return null;
        }
        return exp;
    }
};

const substituteAssignmentExpressionMember = (expression) => {
    let exp = expression;
    let right = substitute(expression.right);
    exp.left.property = substitute(expression.left.property);
    exp.right = right;
    if (expression.left.property.type === 'Literal')
        if (functionVariables.has(expression.left.object.name)){
            let temp = functionVariables.get(expression.left.object.name);
            temp.elements[expression.left.property.value] = right;
            functionVariables.set(expression.left.object.name, temp);
        }
        else {
            let temp = localVariables.get(expression.left.object.name);
            temp.elements[expression.left.property.value] = right;
            localVariables.set(expression.left.object.name, temp);
        }
    if (localVariables.has(expression.left.object.name))
        return null;
    return exp;
};

const substituteFind = (type) => {
    let arrayFunction = [];
    arrayFunction['Literal'] = substituteLiteral;
    arrayFunction['Identifier'] = substituteIdentifier;
    arrayFunction['BinaryExpression'] = substituteBinaryExpression;
    arrayFunction['UnaryExpression'] = substituteUnaryExpression;
    arrayFunction['ArrayExpression'] = substituteArrayExpression;
    arrayFunction['MemberExpression'] = substituteMemberExpression;
    arrayFunction['UpdateExpression'] = substituteUpdateExpression;
    arrayFunction['SequenceExpression'] = substituteSequenceExpression;
    arrayFunction['AssignmentExpression'] = substituteAssignmentExpression;
    return arrayFunction[type];
};

const typeFind = (type) => {
    let arrayFunction = [];
    arrayFunction['Program'] = parseProgram;
    arrayFunction['FunctionDeclaration'] = parseFunctionDeclaration;
    arrayFunction['BlockStatement'] = parseBlockStatement;
    arrayFunction['VariableDeclaration'] = parseVariableDeclaration;
    arrayFunction['ExpressionStatement'] = parseExpressionStatement;
    arrayFunction['WhileStatement'] = parseWhileStatement;
    arrayFunction['IfStatement'] = parseIfStatement;
    arrayFunction['ReturnStatement'] = parseReturnStatement;
    return arrayFunction[type];
};

export {parseCode};