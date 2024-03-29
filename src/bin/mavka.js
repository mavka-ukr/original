#!/usr/bin/env node

import Mavka from "../main.js";
import promptSync from "@kant2002/prompt-sync";
import { DiiaParserSyntaxError } from "mavka-parser/src/utils/errors.js";
import FileLoader from "../loaders/fileLoader.js";

process.removeAllListeners("warning");

const cwdPath = process.cwd();

let command = process.argv[2];

function buildGlobalContext(mavka) {
  const context = new mavka.Context(mavka, null, {
    "друк": mavka.makeProxyFunction((args, context) => {
      console.log(
        ...args
          .map((arg) => {
            return arg.asText(context).asJsValue(context);
          })
      );

      return mavka.empty;
    }),
    "вивести": mavka.makeProxyFunction((args, context) => {
      process.stdout.write(
        args
          .map((arg) => {
            return arg.asText(context).asJsValue(context);
          }).join("")
      );

      return mavka.empty;
    }),
    "читати": mavka.makeProxyFunction((args, context) => {
      const ask = Object.values(args).length ? args[0].asText(context).asJsValue(context) : undefined;

      return mavka.makeText(mavka.external.promptSync({ sigint: true, encoding: "windows-1251" })(ask));
    })
  });

  context.set("__шлях_до_папки_кореневого_модуля__", mavka.makeText(cwdPath));
  context.set("__шлях_до_папки_модуля__", mavka.makeText(cwdPath));
  context.set("__шлях_до_папки_паків__", mavka.makeText(`${cwdPath}/.паки`));

  return context;
}

function buildLoader(mavka) {
  return new FileLoader(mavka);
}

function buildExternal(mavka) {
  return {
    promptSync
  };
}

if (command === "версія") {
  console.log(Mavka.VERSION);
} else if (command === "допомога" || !command) {
  console.log(`
Використання:
  мавка <модуль> [...аргументи]
  мавка <команда> [...аргументи]

Доступні команди:
  мавка <модуль> — виконує модуль
  мавка виконати <модуль> — виконує модуль
  мавка версія — показує версію Мавки
  мавка допомога — друкує це повідолення
  `.trim());
} else {
  if (command === "запустити") {
    command = process.argv[3];
  }

  if (!command.endsWith(".м")) {
    command = `${command}.м`;
  }

  const mavka = new Mavka({
    buildGlobalContext,
    buildLoader,
    buildExternal
  });

  const context = new mavka.Context(mavka, mavka.context);

  function printProgress(name, progress) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`[ ${progress}% ] ${name}`);
  }

  function clearProgress() {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  }

  mavka.events.on("module::load::remote::start", ({ url }) => {
    printProgress(url, 0);
  });
  mavka.events.on("module::load::remote::progress", ({ url, progress }) => {
    printProgress(url, progress);
  });
  mavka.events.on("module::load::remote::stop", () => {
    clearProgress();
  });
  mavka.events.on("module::load::remote::failed", () => {
    clearProgress();
  });

  try {
    await mavka.loader.loadModuleFromFile(context, command);
  } catch (e) {
    if (e instanceof DiiaParserSyntaxError) {
      console.error(`Не вдалось зловити: ${e.message}`);
    } else if (e instanceof mavka.ThrowValue) {
      console.error(`Не вдалось зловити: ${e.value.asText(context).asJsValue(context)}`);
    } else {
      throw e;
    }
  }
}
