import NumberNode from "diia-parser/src/ast/NumberNode.js";
import StringNode from "diia-parser/src/ast/StringNode.js";
import IdentifierNode from "diia-parser/src/ast/IdentifierNode.js";
import ArithmeticNode from "diia-parser/src/ast/ArithmeticNode.js";
import NestedArithmeticNode from "diia-parser/src/ast/NestedArithmeticNode.js";
import AssignNode from "diia-parser/src/ast/AssignNode.js";
import CallNode from "diia-parser/src/ast/CallNode.js";
import DiiaNode from "diia-parser/src/ast/DiiaNode.js";
import ChainNode from "diia-parser/src/ast/ChainNode.js";
import WaitChainNode from "diia-parser/src/ast/WaitChainNode.js";
import IfNode from "diia-parser/src/ast/IfNode.js";
import BooleanNode from "diia-parser/src/ast/BooleanNode.js";
import TestNode from "diia-parser/src/ast/TestNode.js";

class Context {
    constructor(parent) {
        this.parent = parent;

        this.vars = {
            'global': global,
            'глобал': global,
        };
        this.functions = {
            //
        };
    }

    invoke(name, parameters) {
        let fn;

        if (this.functions.hasOwnProperty(name)) {
            fn = this.functions[name];
        } else {
            if (this.parent) {
                return this.parent.invoke(name, parameters);
            }
        }

        if (!fn) {
            throw new Error('Cannot find function: ' + name);
        }

        return fn(...parameters);
    }

    var(name) {
        if (this.vars.hasOwnProperty(name)) {
            return this.vars[name];
        }

        if (this.parent) {
            return this.parent.var(name);
        }

        return undefined;
    }

    evaluate(node) {
        if (node instanceof NumberNode) {
            return node.value;
        }

        if (node instanceof StringNode) {
            return node.value;
        }

        if (node instanceof BooleanNode) {
            return node.value;
        }

        if (node instanceof IdentifierNode) {
            return this.var(node.value);
        }

        if (node instanceof ArithmeticNode) {
            const left = this.evaluate(node.left);
            const right = this.evaluate(node.right);

            switch (node.operation) {
                case '+':
                    return left + right;
                case '-':
                    return left - right;
                case '*':
                    return left * right;
                case '/':
                    return left / right;
                default:
                    return null;
            }
        }

        if (node instanceof NestedArithmeticNode) {
            return this.evaluate(node.arithmetic);
        }

        if (node instanceof AssignNode) {
            return this.vars[node.identifier.value] = this.evaluate(node.value);
        }

        if (node instanceof CallNode) {
            const parameters = node.parameters.map((p) => this.evaluate(p));
            return this.invoke(node.identifier.value, parameters);
        }

        if (node instanceof DiiaNode) {
            const context = new Context(this);

            this.functions[node.name] = (...parameters) => {
                node.parameters.forEach((p, i) => {
                    context.vars[p] = parameters[i];
                });

                return context.run(node.body);
            }

            return context;
        }

        if (node instanceof ChainNode) {
            let prevPart = this.evaluate(node.parts[0]);

            for (let i = 1; i < node.parts.length; i++) {
                if (prevPart instanceof Context) {
                    prevPart = prevPart.evaluate(node.parts[i]);
                } else if (typeof prevPart === "object") {
                    const part = node.parts[i];

                    if (part instanceof IdentifierNode) {
                        prevPart = prevPart[part.value];
                    } else if (part instanceof CallNode) {
                        const parameters = part.parameters.map((p) => this.evaluate(p));
                        prevPart = prevPart[part.identifier.value](...parameters);
                    } else {
                        throw new Error('Failed!');
                    }
                } else {
                    throw new Error('Failed!');
                }
            }

            return prevPart;
        }

        if (node instanceof WaitChainNode) {
            return this.evaluate(node.chain);
        }

        if (node instanceof IfNode) {
            const testResult = this.evaluate(node.expression);

            if (testResult) {
                const ifContext = new Context(this);
                return ifContext.run(node.body);
            } else {
                return;
            }
        }

        if (node instanceof TestNode) {
            const left = this.evaluate(node.left);
            const right = this.evaluate(node.right);

            switch (node.operation) {
                case '==':
                    return left === right;
                case '!=':
                    return left !== right;
                default:
                    return null;
            }
        }
    }

    run(ast) {
        let value = null;
        for (const node of ast) {
            value = this.evaluate(node);
        }
        return value;
    }
}

export default Context;