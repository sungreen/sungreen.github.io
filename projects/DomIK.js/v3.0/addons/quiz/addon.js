import * as THREE from "three";

import * as ROUTE from "../../core/subroute/subroute.js";
import { Ref } from "../../core/subroute/project.js";
import { ModelTools, rotXYZ, vecXYZ } from "../../core/subroute/model.js";
import { nButton } from "../../core/ndiv.js";
import { nInputFile } from "../../core/ndiv.js";
import { setEnable } from "../../core/ndiv.js";

export function registry(def) {
  const addon = {
    content: (app) => {
      const template = addon.newTemplate(0);
      template.frame.mode.set("none");
      const ref = Ref.append(template, { type: "group" });
      Ref.property.new(ref, {name: "source",type: "resource",datatype: "text",});
      Ref.property.new(ref, {name: "background",type: "color", init: "#AABB33",});
      ref.model.finaly = async (ref) => {await init(ref, app);};
    },
  };

  return addon;
}

function mkQuizTimer(ref) {
  const node = Ref.append(ref, { type: "group", name: "Таймер" });
  node.transform.position.set(vecXYZ( 0, 1, 0));
  node.transform.rotation.set(rotXYZ(90, 0, 0));
  node.timeValue = Ref.append(node, {
    type: "text",
    name: "Значение таймера",
  });
  node.timeValue.transform.basis.set(1);
  node.timeValue.text.set("");
  node.frame.mode.set("circle");

  return node;
}

function mkQuizInfo(ref) {
  const node = Ref.append(ref, { type: "group", name: "Информер" });
  node.group.direction.set("column");
  node.transform.position.set(vecXYZ(0, 0.5, -1));
  //node.transform.scale.set(vecXYZ(1.2, 1.2, 1.2));
  node.transform.inscribed.set(true);
  node.frame.mode.set("round rectangle");
  node.frame.color.set("#335577");

  node.title = Ref.append(node, { type: "text", name: "Заголовок" });
  node.title.transform.basis.set(0.15);
  node.title.text.set("🚀 Подключитесь!");

  node.image = Ref.append(node, { type: "image" });
  //node.image.source.set('image/surikat.jpg');
  node.image.source.set("image/qrcode.png");
  node.image.transform.scale.set(vecXYZ(1, 1, 1));

  return node;
}

function setGroupEnable(enabled = [], disabled = []) {
  enabled.forEach((el) => {
    setEnable(el, true);
  });
  disabled.forEach((el) => {
    setEnable(el, false);
  });
}

async function init(ref, app) {
  const codeABCD = ["X", "А", "Б", "В", "Г"];

  if (!ref.quiz_init) {
    ref.quiz_init = true;
    ref.source.set("text/Космическая викторина.txt");

    const background = ref.background.get();

    Ref.children.clear(ref);
    ref.name.set("Содержание");
    ref.group.mode.set("serial");
    ref.group.direction.set("block");

    const quizInfo = mkQuizInfo(ref);
    const quizTimer = mkQuizTimer(ref);

    const quizQuestion = Ref.append(ref, { type: "group", name: "Вопрос" });
    quizQuestion.transform.scale.set(vecXYZ(1.7, 1.7, 1.7));
    quizQuestion.transform.position.set(vecXYZ(0, 0.5, -1));
    quizQuestion.transform.inscribed.set(true);
    quizQuestion.frame.mode.set("round rectangle");
    quizQuestion.frame.color.set(background);

    quizQuestion.group.mode.set("selector");
    quizQuestion.group.direction.set("column");

    const g = Ref.append(quizQuestion, { type: "group", name: "Содержание" });
    g.group.direction.set("row");

    const block1 = Ref.append(g, { type: "text", name: "Номер" });
    block1.text.set("");
    block1.transform.basis.set(1);
    block1.frame.mode.set("round rectangle");

    const block2 = Ref.append(g, { type: "text", name: "Текст вопроса" });
    block2.text.set("");
    block2.transform.basis.set(0);
    block2.frame.mode.set("round rectangle");

    const answers = Ref.append(quizQuestion, { type: "group", name: "Ответы" });
    answers.group.direction.set("row");
    answers.group.limit.set(2);
    answers.frame.mode.set("round rectangle");

    const alist = [];

    for (let code = 1; code <= 4; code++) {
      const a = Ref.append(answers, { type: "group", name: `Выриант ${code}` });
      a.frame.color.set("coral");
      a.frame.mode.set("round rectangle");

      const t0 = Ref.append(a, { type: "text", name: "Код ответа" });
      t0.text.set(codeABCD[code]);
      t0.transform.basis.set(1);
      t0.frame.mode.set("circle");

      const t1 = Ref.append(a, { type: "text", name: "Текст ответа" });
      t1.text.set("");
      t1.transform.basis.set(2);
      // t1.frame.mode.set('round rectangle');
      alist.push([t0, t1, a]);
    }

    const host = makeHost("monitor", app.session.room);

    quizInfo.setVisible(true);
    quizQuestion.setVisible(false);
    quizTimer.setVisible(false);

    host.doQuiz = (text) => {
      cmd_start();
    };

    host.doWaitAnswer = (question, correct, timerset) => {
      update_timer(timerset);
      ROUTE.updateNeeds();
    };

    host.doAttention = (index, range) => {
      if (index) {
        host.quiz.next(index);
        cmd_attention();
      } else {
        cmd_survey();
      }
      ROUTE.updateNeeds();
    };

    host.doQuestion = (index, correct, timerset) => {
      cmd_question(index);
    };

    host.doReport = (index, correct, report) => {
      cmd_report(index);
    };

    host.run();
    ref.host = host;

    function cmd_start() {
      host.timer.break();
      host.sendAttention(0);

      quizInfo.setVisible(true);
      quizQuestion.setVisible(false);
      quizTimer.setVisible(false);

      setGroupEnable([bStart, bStop], [bLoad, bQuest, bTimer, bBreak]);
      cmd_survey();
    }

    function cmd_survey() {
      host.quiz.calc();
      quizInfo.title.text.set(host.quiz.name);
      quizInfo.title.fontSize.set(0.1);
      quizInfo.image.source.set("image/cosmos.png");

      setGroupEnable([bQuest, bStop], [bLoad, bStart, bTimer, bBreak]);
      ROUTE.updateNeeds();
    }

    function cmd_next() {
      host.quiz.next();
      host.sendAttention(host.quiz.current);
      cmd_attention();
    }

    function cmd_attention() {
      const question = host.quiz.base();

      setGroupEnable([bTimer, bStop], [bLoad, bStart, bQuest, bBreak]);

      quizInfo.setVisible(false);
      quizQuestion.setVisible(true);
      quizTimer.setVisible(false);

      block1.text.set(question.index);
      block2.text.set(question.text);
      for (let i = 1; i <= 4; i++) {
        const [t0, t1, a] = alist[i - 1];
        const answer = question.answer(i);
        t0.text.set(codeABCD[answer.code]);
        t1.text.set(answer.text);
        a.frame.color.set("gray");
      }
    }

    function update_timer(timerset) {
      const [current, start, finish, range] = timerset;
      const dtimer = finish - current;
      const diff = Math.floor(dtimer / 1000);
      const factor = 1 - dtimer / range;
      const head = dtimer > 10000 ? "green" : "red";
      quizTimer.timeValue.text.set(diff);
      quizTimer.setVisible(dtimer > 0);
    }

    function cmd_timer() {
      host.sendQuestion(
        host.quiz.params.timerlong,
        (timerset) => {
          update_timer(timerset);
        },
        () => {
          cmd_post();
        }
      );
      cmd_question(host.quiz.current);
    }

    function cmd_question(question) {
      setGroupEnable([bBreak, bStop], [bLoad, bStart, bQuest, bTimer]);
    }

    function cmd_post() {
      host.sendReport();
      cmd_report(host.quiz.current);
    }

    function cmd_report(index) {
      quizInfo.setVisible(false);
      quizQuestion.setVisible(true);
      quizTimer.setVisible(false);

      //const [total, v1, v2, v3, v4] = host.quiz.report();
      if (host.quiz) {
        const answer = host.quiz.question(index).correct;
        const [t0, t1, a] = alist[answer - 1];
        a.frame.color.set("blue");
        ROUTE.updateNeeds();
      }

      if (index < host.quiz.params.range) {
        setGroupEnable([bQuest, bStop], [bLoad, bStart, bTimer, bBreak]);
      } else {
        setGroupEnable([bLoad, bStart], [bQuest, bTimer, bBreak, bStop]);
      }
    }

    function cmd_stop() {
      host.sendStop();
      imperative.text("Опрос завершен! Хорошего дня!");
      panels.visible(false);
    }

    const controls = app.views["model-editor"].workarea.panels.controls;
    controls.do_clear();

    const fs = nInputFile((file) => {
      load_bank(file, host.quiz, () => {
        host.mqtt.newID();
        host.sendAttention(0);
        host.doQuiz();
      });
    });

    const bLoad = nButton(
      controls,
      null,
      "path:mrl",
      fs.do_select,
      "btl bbl alt-border background"
    );
    const bStart = nButton(
      controls,
      null,
      "animation_start",
      cmd_survey,
      "alt-border background"
    );
    const bQuest = nButton(
      controls,
      null,
      "animation_next",
      cmd_next,
      "alt-border background"
    );
    const bTimer = nButton(
      controls,
      null,
      "timer",
      cmd_timer,
      "alt-border background"
    );
    const bBreak = nButton(
      controls,
      null,
      "utimer",
      cmd_post,
      "alt-border background"
    );
    const bStop = nButton(
      controls,
      null,
      "animation_stop:mrr",
      cmd_stop,
      "btr bbr alt-border background"
    );

    setGroupEnable([bLoad], [bStart, bQuest, bTimer, bBreak, bStop]);

    const source = ref.source.get();
    const data = await ModelTools.getResource(source);
    if (data) {
      const text = data.text;
      host.quiz.load(text);
      setEnable(bStart, true);
    }
  }

  ROUTE.updateUnLock("quiz init");
}