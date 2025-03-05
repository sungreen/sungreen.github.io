import * as THREE from 'three';

import * as ROUTE from '../../core/subroute/subroute.js'
import { Ref } from '../../core/subroute/project.js'
import { ModelTools, rotXYZ } from '../../core/subroute/model.js'
// import { makeHost } from '../../masterquiz/core/quizzy.js';

const codeABCD = ['X', 'А', 'Б', 'В', 'Г'];

export function registry( def ) {

    const addon = {
        content: () => {
            const template = addon.newTemplate( 0 );
            const ref = Ref.append( template, { type: 'group' } );
            ref.model.finaly = async ( ref ) => { await init( ref ); }
        }
    }

    return addon;
}

async function init( ref ) {
    if( !ref.quiz_init ) {
        ref.quiz_init = true;
        Ref.children.clear( ref );
        ref.name.set( 'content' );
        ref.group.mode.set( 'serial' );
        ref.group.direction.set( 'block' );
        const quizInfo = Ref.append( ref, { type: 'group' } );
        const quizQuestion = Ref.append( ref, { type: 'group' } );
        quizInfo.setVisible( false );
        quizQuestion.setVisible( false );
 
// QUIZINFO
        quizInfo.name.set( 'Викторина' );
        const quizName = Ref.append( quizInfo, { type: 'text' } );
        quizName.transform.basis.set( 3 );
        quizName.text.set( 'Ура! Викторина!' );

// QUIZTIMER
        const quizTimer = Ref.append( ref, { type: 'group' } );
        quizTimer.transform.rotation.set( rotXYZ(0, 90, 0) );
        quizTimer.timeValue = Ref.append( quizInfo, { type: 'text' } );
        quizTimer.timeValue.transform.basis.set( 1 );
        quizTimer.timeValue.text.set( '' );
        quizTimer.setVisible( false );

// QUIZQUESTION
        quizQuestion.name.set( 'Вопрос' );
        quizQuestion.group.mode.set( 'selector' );
        quizQuestion.group.direction.set( 'column' );
        quizQuestion.setVisible( false );

        const g = Ref.append( quizQuestion, { type: 'group' } );
        g.group.direction.set( 'row' );
        g.name.set( 'Содержание' );

        const block1 = Ref.append( g, { type: 'text' } );
        block1.name.set( 'Номер' );
        block1.text.set( '' );
        block1.transform.basis.set( 1 );

        const block2 = Ref.append( g, { type: 'text' } );
        block2.name.set( 'Текст вопроса' );
        block2.text.set( '' );
        block2.transform.basis.set( 0 );

        const answers = Ref.append( quizQuestion, { type: 'group' } );
        answers.group.direction.set( 'row' );
        answers.group.limit.set( 2 );

        const alist = [];

        for( let code=1; code<=4; code++ ) {
            const a = Ref.append( answers, { type: 'group' } );
            a.name.set( 'Вариант '+code );
            a.frame.color.set( 'coral' );

            const t0 = Ref.append( a, { type: 'text' } );
            t0.name.set( 'Код ответа' );
            t0.text.set( codeABCD[code] );
            t0.transform.basis.set( 1 );
            t0.frame.mode.set( 'circle' );

            const t1 = Ref.append( a, { type: 'text' } );
            t1.name.set( 'Текст ответа' );
            t1.text.set( '' );
            t1.transform.basis.set( 2 );
            t1.frame.mode.set( 'none' );
            alist.push( [t0, t1, a] );
        }

        const host = makeHost( 'monitor' );

        host.doAttention = ( question, range ) => {
            if( !question ) {
                quizName.text.set( host.quiz.name );
                quizInfo.setVisible( true );
                ROUTE.updateNeeds();
            } else {
                quizInfo.setVisible( false );
                quizQuestion.setVisible( true );
                const quiz = host.quiz;
                const q = quiz.questions( question );
                block1.text.set( question );
                block2.text.set( q.text );
                for( let i=1; i<=4; i++ ) {
                    const [t0, t1, a] = alist[i-1];
                    const answer = q.answer( i );
                    t0.text.set( codeABCD[answer.code] );
                    t1.text.set( answer.text );
                    a.frame.color.set( 'gray' );
                }
                ROUTE.updateNeeds();
            }
        }

        host.doWaitAnswer = ( question, correct, timerset ) => {
            const [current, start, finish, range ] = timerset;
            const dtimer = finish - current;
            const diff = Math.floor( dtimer / 1000 );
            const factor = 1 - ( dtimer / range );
            const head = dtimer>10000 ? 'green': 'red';
            quizTimer.timeValue.text.set( diff );
            quizTimer.setVisible( dtimer > 0 );
        }

        host.doReport = ( question, correct, report ) => {
            const [total, v1, v2, v3, v4] = report;
            if( quiz ) {
                const answer = host.quiz.question( question ).correct;
                const [t0, t1, a] = alist[answer-1];
                a.frame.color.set( 'blue' );
                ROUTE.updateNeeds();
            }
        }

        //ROUTE.updateUnLock( 'quiz init' );
    }
}