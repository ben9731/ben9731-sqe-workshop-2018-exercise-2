import $ from 'jquery';
import {parseCode} from './code-analyzer';
import * as esprima from 'esprima';

let functionVariables = new Map();

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let parsedCode = parseCode(codeToParse, functionVariables);
        $('#td1').empty();
        $('#td1').append(parsedCode);
    });
    $('#variableSubmissionButton').click(() => {
        let codeToParse = $('#functionVariablePlaceholder').val();
        functionVariables.clear();
        parseFunctionVariables(codeToParse);
    });
});

const parseFunctionVariables = (codeToParse) => {
    let vars = esprima.parseScript(codeToParse);
    vars.body.forEach(function (element) {
        if (element.type === 'VariableDeclaration'){
            element.declarations.forEach(function (declarator) {
                functionVariables.set(declarator.id.name, declarator.init);
            });
        }
        else if (element.type === 'ExpressionStatement'){
            if (element.expression.type === 'AssignmentExpression'){
                functionVariables.set(element.expression.left.name, element.expression.right);
            }
            else if (element.expression.type === 'SequenceExpression'){
                element.expression.expressions.forEach(function (expr) {
                    functionVariables.set(expr.left.name, expr.right);
                });
            }
        }
    });
};