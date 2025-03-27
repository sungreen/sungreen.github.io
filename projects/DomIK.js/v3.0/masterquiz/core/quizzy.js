const MQ = {
  ATTENTION: 3,
  QUESTION: 4,
  REPORT: 5,
  ACCEPT: 6,
  STOP: 7,
  READY: 8,
  ANSWER: 9,
};

function makeQuiz() {
  const quiz = {
    timer_mode_list: ["30 секунд", "1 минута", "2 минуты"],
    name: "",
    questions: {},
    current: 0,
    source: "",
    users: {},
    params: {
      range: 0,
      timer_mode: null,
      timerlong: 0,
      report_mode: true,
    },
  };

  quiz.question = (index) => {
    if (!quiz.questions[index]) {
      const question = {
        index: index,
        text: "?????",
        correct: 0,
        answers: {},
        report: [0, 0, 0, 0, 0],
        users: {},
      };

      question.user = (id) => {
        if (!question.users[id]) {
          const user = { answer: 0, accept: false };
          user.check = (key) => {
            if (!user[key]) {
              user[key] = true;
              return true;
            }
            return false;
          };
          question.users[id] = user;
        }
        return question.users[id];
      };

      question.answer = (code) => {
        if (!question.answers[code]) {
          const answer = { code: code, text: "" };
          question.answers[code] = answer;
        }
        return question.answers[code];
      };
      quiz.questions[index] = question;
    }
    return quiz.questions[index];
  };

  quiz.user = (id) => {
    if (!quiz.users[id]) {
      const user = { answer: 0, question: 0, code: 0 };
      quiz.users[id] = user;
    }
    return quiz.users[id];
  };

  quiz.report = () => {
    const report = [0, 0, 0, 0, 0];
    const question = quiz.base();
    for (const [id, user] of Object.entries(question.users)) {
      const answer = user.answer;
      if (answer) {
        report[answer]++;
        report[0]++;
      }
    }
    return report;
  };

  quiz.load = (data) => {
    quiz.source = data;
    const lines = data.split(/\r?\n/);
    let question;
    let index = 0;
    let code = 0;
    lines.forEach((line) => {
      if (line.startsWith("NAME:")) {
        const name = line.split(":")[1].trim();
        quiz.name = name;
      } else {
        if (question) {
          if (line.charAt(0) === "*") {
            code++;
            if (line.charAt(1) === "*") question.correct = code;
            const answer = question.answer(code);
            answer.text = line.substring(2).trim();
          } else {
            question = null;
          }
        }
        if (!question) {
          const text = line.trim();
          if (text !== "") {
            index++;
            code = 0;
            question = quiz.question(index);
            question.text = text;
            quiz.params.range = index;
          }
        }
      }
    });
  };

  quiz.next = (index = 0) => {
    if (index) {
      quiz.current = index;
    } else {
      if (quiz.current < quiz.params.range) {
        quiz.current++;
        return true;
      } else {
        return false;
      }
    }
  };

  quiz.base = () => {
    return quiz.question(quiz.current);
  };

  quiz.calc = () => {
    quiz.params.timerlong =
      Math.pow(2, quiz.timer_mode_list.indexOf(quiz.params.timer_mode)) * 30;
  };

  return quiz;
}

function load_bank(file, quiz, onload) {
  readFromFile(file, (text) => {
    quiz.load(text);
    if (onload) onload();
  });
}

function makeHost(mode = [], room) {
  const host = { mode: mode, quiz: makeQuiz() }

  host.decode = (content) => {
    const ret = { mode: "none" };
    const lex = msplit(content, "~", "~");
    const [to, from, code, value, check] = lex[0].split(":").map(Number)

    if (
      !code ||
      from === to ||
      from === host.mqtt.id ||
      (mode === "user" &&
        (code === MQ.ANSWER ||
          code === MQ.READY ||
          (to !== 0 && to !== host.mqtt.id)))
    )
      return null

    ret.to = to
    ret.from = from
    ret.code = code
    ret.value = value
    ret.check = check
    ret.data = lex.length > 1 ? lex[1].split(":").map(Number) : null
    if( lex.length > 2 && lex[2] !== "" ) ret.text = lex[2]
    if (lex.length > 3 && lex[3] !== "" ) ret.objs = JSON.parse(lex[3])
    return ret
  }

  host.send = (
    id = 0,
    code = 0,
    value = 0,
    check = 0,
    data = null,
    text = null,
    objs = null
  ) => {
    if (host.mqtt) {
      const msg = `${id}:${host.mqtt.id}:${[code, value, check].join(":")}~${
        data ? data.join(":") : ""
      }~${text ? text : ""}~${objs ? JSON.stringify(objs) : ""}`;
      host.mqtt.message(msg);
    }
  };

  host.doStatus = (status, param) => {};
  host.doConnect = () => {};
  host.doFailure = (error) => {};
  host.doMessage = (ret) => {};

  host.doQuiz = (text) => {};
  host.doAttention = (question, range) => {};
  host.doQuestion = (question, correct, timerset) => {};
  host.doWaitAnswer = (question, correct, timerset) => {};
  host.doAccept = (question, answer) => {};
  host.doReport = (question, correct, report) => {};
  host.doStop = () => {};
  host.doReady = (code) => {};
  host.doAnswer = (id, question, answer) => {};

  host.sendAttention = (question, repeat) => {
    host.timer.start(0, repeat, () => {
      host.send(
        0,
        MQ.ATTENTION,
        host.quiz.params.range,
        question,
        null,
        host.quiz.source,
        host.quiz.params
      );
    });
  };

  host.sendQuestion = (timerlong, repeat, finish) => {
    host.timer.start(timerlong, finish, (timerset) => {
      host.send(
        0,
        MQ.QUESTION,
        host.quiz.base().correct,
        host.quiz.current,
        timerset
      );
      if (repeat) repeat(timerset);
    });
  };

  host.sendAccept = (id, question, answer) => {
    host.send(id, MQ.ACCEPT, answer, question);
  };

  host.sendReport = () => {
    const question = host.quiz.current;
    const report = host.quiz.report();
    const correct = host.quiz.base().correct;
    host.timer.start(
      0,
      null,
      (timerset) => {
        host.send(0, MQ.REPORT, correct, question, report);
      },
      1000
    );
  };

  host.sendStop = () => {
    host.send(0, MQ.STOP);
  };

  host.sendReady = (code) => {
    host.send(0, MQ.READY, code);
  };

  host.sendAnswer = (question, answer) => {
    host.send(0, MQ.ANSWER, answer, question);
    console.log(host.mqtt.id, question, answer);
  };

  host.timer = makeTimer();

  host.run = () => {
    host.mqtt = MQTT(
      room,
      () => {
        host.timer.clear();
        host.doConnect();
      },
      (error) => {
        host.doFailure(error);
      },
      (msg) => {
        const ret = host.decode(msg);

        if (ret) {
          host.doMessage(ret);
          const id = host.mqtt.id;
          switch (ret.code) {
            case MQ.READY:
              host.quiz.user(ret.from);
              host.doReady(ret.value);
              break;

            case MQ.ANSWER:
              const single_user = host.quiz.user(ret.from);
              const question = ret.check;
              const answer = ret.value;
              single_user.question = question;
              single_user.answer = answer;
              host.sendAccept(ret.from, question, answer);
              host.quiz.question(question).user(ret.from).answer = answer;
              host.doAnswer(ret.from, question, answer);
              break;

            case MQ.ATTENTION:
              if (ret.text && host.quiz.source !== ret.text) {
                host.quiz.load(ret.text);
                host.sendReady(ret.code);
                host.doQuiz(ret.text);
              }
              if (ret.objs) {
                host.quiz.params = ret.objs;
                host.quiz.calc();
              }
              if (ret.check) {
                const user = host.quiz.question(ret.check).user(0)
                if (user.check("attention") || host.quiz.params.range !== ret.value) {
                  host.quiz.params.range = ret.value
                  host.doAttention(ret.check, ret.value)
                  host.sendReady(ret.code)
                }
              }
              break

            case MQ.QUESTION:
              {
                const question = host.quiz.question(ret.check);
                question.correct = ret.value;
                const timerset = ret.data;
                const user = question.user(0);

                if (user.check("question")) {
                  host.doQuestion(question.index, question.correct, timerset);
                  host.sendReady(ret.code);
                } else {
                  host.doWaitAnswer(question.index, question.correct, timerset);
                }

                if (user.answer && !user.accept) {
                  host.sendAnswer(question.index, user.answer);
                }
              }
              break;

            case MQ.ACCEPT:
              {
                const question = host.quiz.question(ret.check);
                const user = question.user(0);
                if (user.check("accept")) {
                  host.doAccept(question.index, ret.value);
                  host.sendReady(ret.code);
                }
              }
              break;

            case MQ.REPORT:
              {
                const question = host.quiz.question(ret.check);
                question.report = ret.data;
                question.correct = ret.value;
                const user = question.user(0);
                user.ok = user.answer === question.correct;

                if (user.check("report")) {
                  host.timer.break();
                  host.doReport(
                    question.index,
                    question.correct,
                    question.report
                  );
                  host.sendReady(ret.code);
                }
              }
              break;

            case MQ.STOP:
              host.doStop();
              host.sendReady(ret.code);
              break;
          }
        }
      },
      (status) => {
        host.doStatus(status);
      }
    );
  };
  return host;
}