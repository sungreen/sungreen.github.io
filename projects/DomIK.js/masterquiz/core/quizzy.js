const quiz = makeQuiz();

function makeQuiz() {
    const quiz = {
        name: '',
        questions: {},
        range: 0,
        timer_mode: null,
        report_mode: true,
        source:'',
        users:{}
    };

    quiz.question = ( index ) => {
        if( !quiz.questions[index] ) {
            const question = {
                text: '?????',
                correct: 0,
                answers: {},
                report: [0, 0, 0, 0, 0],
                users: {}
            }

            question.user = ( id ) => {
                if( !question.users[id] ) {
                    const user = { answer:0 }
                    user.check = ( key ) => { if( !user[key] ) { user[key] = true; return true; } return false; }
                    question.users[id] = user;
                }
                return question.users[id];
            }

            question.answer = ( code ) => {
                if( !question.answers[code] ) {
                    const answer = { code: code, text:'' };
                    question.answers[code] = answer;
                }
                return question.answers[code];
            }

            quiz.questions[index] = question;
        }

        return quiz.questions[index];
    }

    quiz.user = ( id ) => {
        if( !quiz.users[id] ) {
            const user = { answer:0, question:0, code:0 }
            quiz.users[id] = user;
        }
        return quiz.users[id];
    }

    quiz.report = ( index ) => {
        const report = [0, 0, 0, 0, 0];
        const question = quiz.question( index );
        for( const [id, user] of Object.entries(question.users) ) {
            const answer = user.answer;
            if( answer ) {
                report[answer]++;
                report[0]++;
            }
        }
        return report;
    }

    quiz.load = ( data ) => {
        quiz.source = data;
        const lines = ( data ).split(/\r?\n/);
        let question;
        let index = 0;
        let code = 0;
        lines.forEach( ( line ) => {
            if( line.startsWith('NAME:') ) {
                const name = line.split( ':' )[1].trim();
                quiz.name = name;
            } else {
                if( question ) {
                    if( line.charAt(0) === '*' ) {
                        code++;
                        let test = false;
                        let text = line.substring( 2 ).trim();
                        if( line.charAt(1) === '*' ) question.correct = code;
                        const answer = question.answer( code );
                        answer.text = text;
                    } else {
                        question = null;
                    }
                }
                if( !question ) {
                    const text = line.trim();
                    if( text !== '' ) {
                        index++;
                        code = 0;
                        question = quiz.question( index );
                        question.text = text;
                        quiz.range = index;
                    }
                }
            }
        } );
    }

    return quiz;
}

function load_bank( file, quiz, onload ) {
    readFromFile( file, ( text ) => {
        quiz.load( text );
        if( onload ) onload();
    } );
}

const MQ = {
    MASTER_QUIZ: 1,
    MASTER_ATTENTION: 2,
    MASTER_QUESTION: 3,
    MASTER_REPORT: 4,
    MASTER_ACCEPT: 5,
    MASTER_STOP: 6,
    USER_READY: 7,
    USER_ANSWER: 8,
}

function makeHost( mode='user' ) {
    const quiz = makeQuiz();
    const autoID = ( mode === 'monitor' )? 100: 0;
    const host = { mode: mode === 'monitor'? 'user': mode };

    host.decode = ( msg ) => {
        const ret = { mode:'none' };
        const lex = msplit( msg.payloadString, '~', '~' );
        const [id, code, value, check] = lex[0].split(':').map(Number);

        ret.id = id;
        ret.code = code;
        ret.value = value;
        ret.check = check;
        ret.data = lex.length>1? lex[1].split(':').map(Number): null;
        ret.text = lex.length>2? lex[2]: null;

        if( host.mode === 'master' && code > MQ.MASTER_STOP && host.mqtt.id !== id && id !== 0 ) {
            // Я мастер И Сообщения от пользователя И Чужие И Необщие
            ret.mode = host.mode;
        } else if( host.mode === 'user' && code <= MQ.MASTER_STOP && ( host.mqtt.id === id || id === 0) ) {
            // Я пользователь И Сообщения от мастера И ( Для меня ИЛИ Общие )
            ret.mode = host.mode;
        }
        return ret;
    }

    host.send = ( id=0, code=0, value=0, check=0, data=null, text=null ) => {
        if( host.mqtt ) {
            const msg = `${code > MQ.MASTER_STOP ? host.mqtt.id: id}:${[code, value, check].join( ':' )}~${data?data.join( ':' ):''}~${text?text:''}`;
            host.mqtt.message( msg );
        }
    }

    host.doConnect = () => {}
    host.doFailure = ( error ) => {}
    host.doMessage = ( ret ) => {} 

    if( mode === 'master' ) {
        host.sendQuiz = ( text ) => { host.send( 0, MQ.MASTER_QUESTION, 0, 0, null, text ); }

        host.sendAttention = ( question, repeat ) => { host.timer.start( 0, repeat, () => { host.send( 0, MQ.MASTER_ATTENTION, quiz.range, question, null, host.quiz.source ); } ); }
        host.sendQuestion = ( question, timerlong, repeat, finish ) => { host.timer.start( timerlong, finish, ( timerset ) => { host.send( 0, MQ.MASTER_QUESTION, quiz.question( question ).correct, question, timerset ); if( repeat ) repeat( timerset ); } ); }

        host.sendAccept = ( id, question, answer ) => { host.send( id, MQ.MASTER_ACCEPT, answer, question ); }

        host.sendReport = ( question ) => {
            const report = quiz.report( question );
            const correct = quiz.question( question ).correct;
            host.timer.start( 0, null, ( timerset ) => { host.send( 0, MQ.MASTER_REPORT, correct, question, report ); } );
        }

        host.sendStop = () => { host.send( 0, MQ.MASTER_STOP ); }
        host.doReady = ( code ) => {}
        host.doAnswer = ( id, question, answer ) => {}
    } else {
        host.doQuiz = ( text ) => {}
        host.doAttention = ( question, range ) => {}
        host.doQuestion = ( question, correct, timerset ) => {}
        host.doWaitAnswer = ( question, correct, timerset ) => {}
        host.doAccept = ( question, answer ) => {}
        host.doReport = ( question, correct, report ) => {}
        host.doStop = () => {}
        host.sendReady = ( code ) => { host.send( 0, MQ.USER_READY, code ); }
        host.sendAnswer = ( question, answer ) => { host.send( 0, MQ.USER_ANSWER, answer, question ); }
    }

    host.timer = makeTimer();

    host.run = () => {
        host.mqtt = MQTT(
            room,
            () => {
                host.timer.clear();
                host.doConnect();
            },
            ( error ) => {
                host.doFailure( error );
            },
            ( msg ) => {
                let index, question, answer, correct, accept, timerset, report, range, user, text;
                const ret = host.decode( msg );
                if( ret.mode === host.mode ) {
                    if( host.mode === 'user' ) {
                        console.log( ret );
                        host.doMessage( ret );
                        const id = host.mqtt.id;
                        switch( ret.code ) {
                            // case MQ.MASTER_QUIZ:
                            //     if( quiz.source !== ret.text ) {
                            //         quiz.load( ret.text, () => { host.sendReady( ret.code ); host.doQuiz( ret.text ); } );
                            //     }
                            //     break;

                            case MQ.MASTER_ATTENTION:
                                question = ret.check;
                                range = ret.value;
                                text = ret.text;
                                user = quiz.question( question ).user( 0 );

                                if( quiz.source !== text ) {
                                    quiz.load( text );
                                    host.sendReady( ret.code );
                                    host.doQuiz( text );
                                    host.doAttention( question, range );
                                }

                                if( user.check( 'attention' ) || quiz.range !== range ) {
                                    quiz.range = range;
                                    host.doAttention( question, range );
                                    host.sendReady( ret.code );
                                }

                                break;

                            case MQ.MASTER_QUESTION:
                                question = ret.check;
                                correct = ret.value;
                                timerset = ret.data;
                                quiz.question( question ).correct = correct;
                                user = quiz.question( question ).user( 0 );
                                user

                                if( user.check( 'question' ) ) {
                                    host.doQuestion( question, correct, timerset );
                                    host.sendReady( ret.code );
                                    // offline timer host.timer.start( timerset[3]/1000, ()=>{}, ( timerset ) => { host.doWaitAnswer( question, correct, timerset ); } );
                                } else {
                                    // online timer
                                    host.doWaitAnswer( question, correct, timerset );
                                }

                                if( user.answer && !user.accept ) {
                                    host.sendAnswer( question, user.answer );
                                }

                                break;

                            case MQ.MASTER_ACCEPT:
                                question = ret.check;
                                accept = ret.value;
                                user = quiz.question( question ).user( 0 );

                                if( user.check( 'accept' ) ) {
                                    host.doAccept( question, accept );
                                    host.sendReady( ret.code );
                                }
                                break;

                            case MQ.MASTER_REPORT:
                                index = ret.check;
                                correct = ret.value;
                                report = ret.data;

                                question = quiz.question( index );
                                question.report = report; 
                                question.correct = correct;
                                user = question.user( 0 );
                                user.ok = ( user.answer === correct );

                                if( user.check( 'report' ) ) {
                                    host.timer.break();
                                    host.doReport( index, correct, report );
                                    host.sendReady( ret.code );
                                }
                                break;

                            case MQ.MASTER_STOP:
                                host.doStop();
                                host.sendReady( ret.code );
                            break;
                        }
                    } else {
                        const id = ret.id;
                        if( id > 1000 ) {
                            let user = quiz.user( id );
                            user.code = ret.code;
                            if( ret.code === MQ.USER_READY ) host.doReady( ret.value );
                            else if( ret.code === MQ.USER_ANSWER ) {
                                const question = ret.check;
                                const answer = ret.value;
                                user.question = question;
                                user.answer = answer;
                                host.sendAccept( id, question, answer );
                                user = quiz.question( question ).user( id );
                                user.answer = answer;
                                host.doAnswer( id, question, answer );
                            }
                        }
                    }
                }
            },
            autoID
        );
    }

    host.quiz = quiz;

    return host;
}