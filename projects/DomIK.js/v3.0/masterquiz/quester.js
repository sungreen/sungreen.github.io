"use strict";

const appname = "Квестер";
const version = "1.2503";
const reload_time = 30;

function autoReload() {
  console.log("autorelod");
  document.location.reload();
}

function waitConnect() {
  console.log("wait connect");
}

const theme = {};
theme.tone = 300;
theme.color = { background: CSS.hsl(theme.tone, 50, 5) };
theme.background = `background:${theme.color.background}`;

const WB = ["🔲", "🔳", ""];
const WL = ["X", "А", "Б", "В", "Г"];
const WS = ["🔳", "🟥", "🟨", "🟩", "🟦", "✅"];
const WC = ["black", "red", "orange", "green", "blue"];

function setInfobar(p, host) {
  let ping = true;
  const panel = nDiv(p).classes("row border");
  const route = nText(panel);
  const timer = nText(panel);
  const bg = "royalblue";
  const c1 = "seagreen";
  const c2 = "tomato";
  const c3 = "orange";

  panel.updatePing = () => {
    ping = !ping;
    route.text(WB[ping ? 0 : 1]);
  };

  panel.updateTimer = (timerset) => {
    const mid = host.mqtt ? `${host.mqtt.topic} [${host.mqtt.id}]` : "*";
    if (timerset) {
      const time = ("" + new Date()).split(" ")[4];
      const [current, timer_start, timer_finish, timer_range] = timerset;
      const dtimer = timer_finish - current;
      const diff = Math.floor(dtimer / 1000);
      const factor = 1 - dtimer / timer_range;
      const head = dtimer > 10000 ? c1 : c2;
      const tail = bg;
      timer.text(`⏲ Время: ${time} Осталось секунд: ${diff}`);
      panel.styles(
        `background:${CSS.grad(
          bg,
          c3,
          head,
          factor * 100 - 2,
          factor * 100,
          factor * 100,
          0.3
        )}`
      );
    } else {
      timer.text(`${appname} ${version} Комната: ${mid}`);
      panel.styles(`background:${bg}`);
    }
  };

  panel.updatePing();
  panel.updateTimer();
  return panel;
}

function setInfoQuiz(p, host) {
  const info = nColumn(p).classes("column");
  const bload = nWidget(
    info,
    nProperty(host.quiz, "bank", "FILE", {
      label: "Загрузить банк вопросов",
      types: [".txt"],
      onload: (file) => {
        load_bank(file, host.quiz, () => {
          info.update();
          host.mqtt.newID();
          host.sendAttention(0);
        });
      },
    })
  );

  const n = nText(info).classes("column");
  info.update = () => {
    n.clear();

    nText(n, "Настройки опроса:").classes("caption");

    nWidget(
      n,
      nProperty(host.quiz.params, "range", "NUMBER", {
        label: "Количество вопросов: ",
        min: 1,
        max: 10,
        step: 1,
        init: 3,
      })
    );

    nWidget(
      n,
      nProperty(host.quiz.params, "timer_mode", "SELECT", {
        label: "Ожидание ответа: ",
        options: host.quiz.timer_mode_list,
        init: host.quiz.timer_mode_list[1],
      })
    );

    nWidget(
      n,
      nProperty(host.quiz.params, "report_mode", "CHECKBOX", {
        label: "Показать результат участнику: ",
        init: true,
      })
    );

    nText(n, `Название: ${host.quiz.name}`).classes("caption");
    for (let i = 1; i <= host.quiz.params.range; i++) {
      nText(n, `<${i}> ${host.quiz.question(i).text}`).classes(
        "caption preline"
      );
    }
  };

  info.update();
  return info;
}

function setInfoReport(p, host) {
  const n = nText(p);
  n.update = (question, correct, report = [0, 0, 0, 0, 0]) => {
    n.visible(false);
    let total = report[0];
    n.clear();
    const r = nColumn(n).classes("align-items:left");
    nText(r, `Вопрос № ${question}`).classes("caption");
    nText(r, `${host.quiz.question(question).text}`).classes("caption");
    for (let i = 1; i <= 4; i++) {
      const bar = nRow(r).classes("margin");
      const value = total ? (report[i] / total) * 100 : 0;
      const level = Math.ceil(value / 10);
      const sup1 = value ? `${WS[i].repeat(level)} ${value.toFixed(0)}%` : "";
      const sup2 = `${host.quiz.question(question).answer(i).text}`;
      nText(bar, `${WL[i]}) ${WS[i === correct ? 5 : 0]} ${sup1} ${sup2}`);
      if (i === correct) bar.classes("border");
    }
    n.visible(true);
  };
  return n;
}

function setinfoUsers(p, host) {
  const n = nText(p);
  n.update = (question) => {
    const users = host.quiz.users;
    let active = 0;
    let count = 0;
    let list = "";
    for (const [id, user] of Object.entries(users)) {
      if (Number(id) !== host.mqtt.id) {
        const userActive = host.quiz.question(question).users[id];
        if (userActive && userActive.answer) {
          active++;
          list += `${id}${WS[userActive.answer]} `;
        } else {
          list += `${id}${WS[0]} `;
        }
        count++;
      }
    }
    n.text(
      `Участников ${count} Ответов ${active} Активность ${(count
        ? (active / count) * 100
        : 0
      ).toFixed(1)}% [${list}]`
    ).classes("preline");
  };
  return n;
}

// MASTER
function master(room, p) {
  const host = makeHost("master", room);
  const top = nColumn(p);
  const info = nColumn(top);
  const infoPanel = setInfobar(info, host).classes("border margin ft0");
  const imperative = nText(top, "Дождитесь подключения").classes(
    "border margin ft0"
  );
  const panels = nRow(top).visible(false);
  const left = nColumn(panels)
    .classes("border margin panel")
    .styles("width:30em");
  const bpan = nColumn(left);
  const bStart = nButton(bpan, "⚠ Начать опрос").classes("ft0").enable(true);
  const bQuest = nButton(bpan, "⚠ Перейти к вопросу")
    .classes("ft0")
    .enable(false);
  const bTimer = nButton(bpan, "⏲ Запустить таймер")
    .classes("ft0")
    .enable(false);
  const bBreak = nButton(bpan, "⏱ Завершить досрочно")
    .classes("ft0")
    .enable(false);
  const bStop = nButton(bpan, "⚠ Завершить опрос").classes("ft0").enable(false);

  const right = nColumn(panels)
    .classes("border margin panel")
    .styles("flex-grow:1");
  const infoQuiz = setInfoQuiz(right, host).visible(true);
  const infoReport = setInfoReport(right, host).visible(false);
  const infoUsers = setinfoUsers(top, host)
    .classes("column border margin panel")
    .visible(false);
  host.run();

  host.doConnect = () => {
    imperative.text("Успешное подлючение!!!");
    cmd_start();
  };

  host.doFailure = (error) => {
    imperative.text(
      `Ошибка подключения ${error.errorMessage}. Обновите страницу.`
    );
    nButton(top, "Перезагрузить Квэстер").run(autoReload).classes("ft2");
  };

  host.doReady = (code) => {
    infoPanel.updatePing();
    infoUsers.update(host.quiz.current);
  };

  host.doAnswer = (id, question, answer) => {
    infoUsers.update(host.quiz.current);
  };

  host.doQuiz = (text) => {
    imperative.text("Режим кооперации!!!");
    infoQuiz.update();
    cmd_start();
  };

  host.doWaitAnswer = (question, correct, timerset) => {
    infoPanel.updateTimer(timerset);
  };

  host.doAttention = (question, range) => {
    if (question === 0) {
      cmd_survey();
    } else {
      host.quiz.next(question);
      cmd_attension();
    }
  };

  host.doQuestion = (question, correct, timerset) => {
    cmd_question(question);
  };

  host.doReport = (question, correct, report) => {
    cmd_report(question);
  };

  function cmd_start() {
    host.timer.break();
    host.sendAttention(0);
    panels.visible();
    imperative.text("Попросите участников подключиться");

    bStart.enable(true).run(cmd_survey);
    bQuest.enable(false);
    bTimer.enable(false);
    bBreak.enable(false);
    bStop.enable(false).run(cmd_stop);

    infoUsers.visible();
    infoQuiz.visible();
  }

  function cmd_survey() {
    infoQuiz.visible(false);
    host.quiz.calc();
    cmd_next();
  }

  function cmd_next() {
    host.quiz.next();
    host.sendAttention(host.quiz.current);
    cmd_attension();
  }

  function cmd_attension() {
    const correct = host.quiz.question(host.quiz.current).correct;
    const range = host.quiz.params.range;
    infoUsers.update(host.quiz.current);
    imperative.text(`Озвучьте вопрос №${host.quiz.current} и запустите таймер`);

    bStart.enable(false);
    bQuest.enable(false);
    bTimer
      .enable(true)
      .text(`⏲ Запустить таймер ${host.quiz.params.timerlong}`)
      .run(cmd_timer);
    bBreak.enable(false);
    bStop.enable(true);

    infoQuiz.visible(false);
    infoReport.visible(true);
    infoReport.update(host.quiz.current);
  }

  function cmd_timer() {
    host.sendQuestion(
      host.quiz.params.timerlong,
      (timerset) => {
        infoPanel.updateTimer(timerset);
      },
      () => {
        infoPanel.updateTimer();
        cmd_post();
      }
    );
    cmd_question(host.quiz.current);
  }

  function cmd_question(question) {
    imperative.text(`Попросите участников ответить на вопрос №${question}`);

    bStart.enable(false);
    bQuest.enable(false);
    bTimer.enable(false);
    bBreak
      .enable(true)
      .text("⏲ Завершить досрочно")
      .run(() => {
        host.timer.break();
        cmd_post();
      });
    bStop.enable(true);

    infoQuiz.visible(false);
    infoReport.visible(true);
    infoReport.update(host.quiz.current);
  }

  function cmd_post() {
    host.sendReport();
    cmd_report(host.quiz.current);
  }

  function cmd_report(question) {
    imperative.text(`Озвучьте результат голосования`);
    infoPanel.updateTimer();
    infoQuiz.visible(false);
    infoReport.visible(true);
    infoReport.update(question, host.quiz.base().correct, host.quiz.report());

    if (question < host.quiz.params.range) {
      bStart.enable(false);
      bQuest
        .enable(true)
        .text(`Перейти к вопросу №${question + 1}`)
        .run(cmd_next);
      bTimer.enable(false);
      bBreak.enable(false);
      bStop.enable(true);
    } else {
      bStart.enable(true).text("⚠ Новый опрос").run(autoReload);
      bQuest.enable(false);
      bTimer.enable(false);
      bBreak.enable(false);
      bStop.enable(true).run(cmd_stop);
    }
  }

  function cmd_stop() {
    host.sendStop();
    imperative.text("Опрос завершен! Хорошего дня!");
    panels.visible(false);
  }
}

// USER
function user(room, p) {
  const host = makeHost("user", room);
  function setLevelUp(p, host) {
    const n = nDiv(p);
    const timer = makeTimer();
    function randBG() {
      top.styles(
        `background:${CSS.grad(
          theme.color.background,
          CSS.random(),
          CSS.random(),
          0,
          50,
          100
        )}`
      );
    }
    function standBG() {
      top.styles(`background:${theme.color.background}`);
    }
    n.update = (question) => {
      n.clear();
      let stars = 0;
      for (const [index, data] of Object.entries(host.quiz.questions)) {
        if (data.report[0]) {
          const ok = data.user(0).ok;
          if (ok) stars++;
          const cf = (Number(index) / user.range) * 128;
          nText(n, ok ? "🌟" : "❌").styles(
            ok
              ? `background:${CSS.rgb(cf, 128 - cf, 64)}`
              : `background:${theme.color.background}`
          );
        }
      }
      if (stars) {
        nText(n, `(${stars})`).styles(`background:${CSS.rgb(0, 128, 64)}`);
      } else {
        nText(n, "💭");
      }
      if (question) {
        const q = host.quiz.question(question).user(0);
        if (q.ok) makeTimer().start(2, standBG, randBG, 33);
      }
    };
    n.update();
    return n;
  }

  function userReport(p) {
    const list = nDiv(p).classes("column");
    nText(list).text("Результат").classes("caption");
    for (const [index, question] of Object.entries(host.quiz.questions)) {
      const num = Number(index);
      if (num) {
        const user = question.user(0);
        const answer = user.answer;
        const ok = user.ok;
        const corrent = question.correct;
        nText(
          list,
          `Вопрос ${num} Ответ ${WL[answer]} ${WS[answer]} ${
            ok ? WS[5] : WS[0]
          }`
        ).classes("caption");
      }
    }
  }
  const MSG = {
    connect: "Идет подключение",
    wait1: "Ждите начала",
    wait2: "Ждите окончания",
    wait3: "Ждите другой вопрос",
    warning: "Внимание! Уже скоро",
    error: "Ошибка подключения",
    select: "Выберите ответ",
    reload: "Перезагрузить",
    goodbay: "Хорошего дня!",
  };

  host.doConnect = () => {
    host.timer.clear();
    imperative.text(MSG.wait1);
  };

  host.doFailure = (error) => {
    imperative.text(MSG.error);
    buttons.visible(false);
    nButton(p, MSG.reload).run(autoReload).classes("ft2");
  };

  host.doMessage = (ret) => {
    infoPanel.updatePing();
  };

  host.doAttention = (question, range) => {
    imperative.text(MSG.warning);
    if (question) {
      questnum.text(`Вопрос № ${question} из ${range}`).visible();
    } else {
      questnum.text(`Количество вопросов ${range}`).visible();
    }
    buttons.visible(false);
    infoReport.visible(false);
  };

  host.doWaitAnswer = (question, correct, timerset) => {
    infoPanel.updateTimer(timerset);
  };

  host.doQuestion = (question, correct, timerset) => {
    infoPanel.updateTimer(timerset);
    imperative.text(MSG.select);
    questnum.text(`Вопрос № ${question}`).visible();
    for (let i = 1; i <= 4; i++) {
      answers[i - 1].text(WL[i]).run(() => {
        host.quiz.question(question).user(0).answer = i;
        imperative.text(MSG.wait2);
        questnum
          .text(
            `Вопрос ${question} ${WS[answer]} Ответ отправлен ${WL[answer]}`
          )
          .visible();
        buttons.visible(false);
        infoReport.visible(false);
      });
    }
    buttons.visible();
  };
  host.doAccept = (question, answer) => {
    imperative.text(MSG.wait2);
    questnum
      .text(`Вопрос ${question} ${WS[answer]} Ответ принят ${WL[answer]}`)
      .visible();
    buttons.visible(false);
    infoReport.visible(false);
  };
  host.doReport = (question, correct, report) => {
    infoPanel.updateTimer();
    infoReport.update(question, correct, report);
    levelUp.update(question);
    imperative.text(MSG.wait3);
    questnum.visible();
    buttons.visible(false);
  };
  host.doStop = () => {
    imperative.text(MSG.goodbay);
    questnum.visible(false);
    buttons.visible(false);
    infoReport.clear();
    userReport(infoReport);
  };
  const top = nColumn(p).styles(`align-items:left width:100vw height:100vh`);
  const infoPanel = setInfobar(top, host).classes("border margin ft0");
  const levelUp = setLevelUp(top, host).classes("border margin ft1");
  const imperative = nText(top, MSG.connect).classes("border margin ft1");
  const view = nColumn(top).classes("ft1");
  const questnum = nText(view).classes("border margin").visible(false);
  const buttons = nColumn(view).visible(false);
  const line1 = nRow(buttons);
  const line2 = nRow(buttons);
  const answers = [
    nButton(line1),
    nButton(line1),
    nButton(line2),
    nButton(line2),
  ];
  answers.forEach((button) => {
    button.classes("ft3").styles("width:50vwheight:22vh");
  });
  const infoReport = setInfoReport(view, host)
    .classes("border margin ft0")
    .visible(false);
  host.run();
}

// STUB
function user_stub(room, p, num) {
  const host = makeHost("user", room);
  host.doConnect = () => {
    host.sendReady(MQ.READY);
    imperative.text(`${num} ${host.mqtt.id} Участвует`);
  };
  host.onFailure = (error) => {
    imperative.text(MSG.error);
  };
  host.doQuiz = () => {
    imperative.text(`${host.mqtt.id} ${host.quiz.name}`);
  };
  host.doAttention = (question, range) => {
    imperative.text(`${host.mqtt.id} ${range} из ${question}`);
  };
  host.doQuestion = (question, correct, timerset) => {
    host.randomWait = randomInt(35, 5);
    host.randomAnswer = Math.random() < 0.6 ? correct : randomInt(3, 1);
  };
  host.doWaitAnswer = (question, correct, timerset) => {
    const [current, timer_start, timer_finish, timer_range] = timerset;
    const dt = Math.floor((timer_finish - current) / 1000);
    if (dt < host.randomWait) {
      if (!host.quiz.question(question).user(0).answer) {
        host.quiz.question(question).user(0).answer = host.randomAnswer;
      }
      imperative.text(
        `${host.mqtt.id} В:${question} Ответ ${host.randomAnswer}`
      );
    } else {
      imperative.text(
        `${host.mqtt.id} В:${question} Ждет ${dt} ${host.randomWait}`
      );
    }
  };
  host.doStop = () => {
    imperative.text(`${host.mqtt.id} Завершен`);
  };
  const imperative = nText(p, `${num} Создан`).classes("border margin ft0");
  host.run();
}

// MONITOR
function monitor(room, p) {
  const gui = {};
  gui.top = nColumn(p).styles(`align-items:left width:100vw height:100vh`);
  gui.imperative = nText(gui.top, "Дождитесь подключения").classes(
    "border margin ft0 preline"
  );
  gui.timer = nText(gui.top).classes("border margin ft0 preline");

  const host = makeHost("monitor", room);

  host.doConnect = () => {
    gui.imperative.text(`Монитор подключен`);
  };
  host.doFailure = (error) => {
    gui.imperative.text(`Ошибка подключения ${error}`);
  };
  host.doAttention = (question, range) => {
    gui.imperative.text(`Викторина ${host.quiz.name}`);
  };
  host.doQuestion = (question, correct, timerset) => {
    const [current, begin, finish, range] = timerset;
    const q = host.quiz.question(question);
    let t = q.text;
    for (let i = 1; i <= 4; i++) {
      t = `${t} ${i} ${q.answers[i].text}`;
    }
    gui.imperative.text(t);
  };
  host.doWaitAnswer = (question, correct, timerset) => {
    const [current, start, finish, range] = timerset;
    const sf = ((finish - current) / range) * 100;
    gui.timer.text(`${sf}%`);
  };
  host.doReport = (question, correct, report) => {
    const [total, v0, v1, v2, v3] = report;
    gui.imperative.text(
      `${host.quiz.question(question).text} ${
        host.quiz.question(question).correct
      } = ${correct}`
    );
  };
  // host.timer.start( reload_time, autoReload, waitConnect )
  host.run();
}
