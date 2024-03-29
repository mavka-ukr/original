import Instruction from "./utils/instruction.js";
import { ContinueSignal } from "./continueInstruction.js";
import { BreakSignal } from "./breakInstruction.js";
import { ReturnSignal } from "./returnInstruction.js";

class EachInstruction extends Instruction {
  /**
   * @param {Context} context
   * @param {EachNode} node
   * @returns {*}
   */
  runSync(context, node) {
    const iterator = this.mavka.runSync(context, node.iterator);

    if (typeof iterator[Symbol.iterator] !== "function") {
      const linestr = node.context.fileinfo.code.split("\n")[node.context.start.line - 1];
      const arrow = " ".repeat((node.context.start.column || 1) - 1) + "^";
      this.mavka.fall(context, this.mavka.toCell(`Неможливо виконати перебір на ${node.context.start.line}:${node.context.start.column}\n${linestr}\n${arrow}`));
    }

    let result = null;

    for (const item of iterator) {
      if (node.keyName) {
        context.set(node.keyName.name, item.key);
      }
      if (node.name) {
        context.set(node.name.name, item.value);
      }

      const value = this.mavka.run(context, node.body);

      if (value instanceof ContinueSignal) {
        continue;
      }

      if (value instanceof BreakSignal) {
        break;
      }

      if (value instanceof ReturnSignal) {
        result = value;
        break;
      }
    }

    if (node.keyName) {
      context.delete(node.keyName.name);
    }
    if (node.name) {
      context.delete(node.name.name);
    }

    return this.mavka.empty;
  }

  /**
   * @param {Context} context
   * @param {EachNode} node
   * @returns {Promise<*>}
   */
  async runAsync(context, node) {
    const iterator = await this.mavka.runAsync(context, node.iterator);

    if (typeof iterator[Symbol.iterator] !== "function") {
      const linestr = node.context.fileinfo.code.split("\n")[node.context.start.line - 1];
      const arrow = " ".repeat((node.context.start.column || 1) - 1) + "^";
      this.mavka.fall(context, this.mavka.toCell(`Неможливо виконати перебір на ${node.context.start.line}:${node.context.start.column}\n${linestr}\n${arrow}`));
    }

    let result = null;

    for (const item of iterator) {
      if (node.keyName) {
        context.set(node.keyName.name, item.key);
      }
      if (node.name) {
        context.set(node.name.name, item.value);
      }

      const value = await this.mavka.run(context, node.body);

      if (value instanceof ContinueSignal) {
        continue;
      }

      if (value instanceof BreakSignal) {
        break;
      }

      if (value instanceof ReturnSignal) {
        result = value;
        break;
      }
    }

    if (node.keyName) {
      context.delete(node.keyName.name);
    }
    if (node.name) {
      context.delete(node.name.name);
    }

    return this.mavka.empty;
  }
}

export default EachInstruction;
