let caList = {}
let formList = {};
let answersList = [];

const importGptModule = async () => {
    const gptModule = await import(chrome.runtime.getURL("gpt.js"));
    return gptModule;
};

const importAPModule = async () => {
    const apModule = await import(chrome.runtime.getURL("answersProcessing.js"));
    return apModule;
};

const importCA = async () => {
    const { getCA } = await import(chrome.runtime.getURL("correctAnswers.js"));
    return getCA();
};

const blockEls = document.querySelectorAll('.Qr7Oae .geS5n');

blockEls.forEach(el => {
    const questionEl = el.querySelector('.M7eMe');
    const questionText = questionEl ? questionEl.innerText.trim() : null;

    const answersEls = el.querySelectorAll('label');
    const answers = Array.from(answersEls).map(answerEl => ({
        text: answerEl.innerText.trim(),
        element: answerEl
    }));

    const isMany = Array.from(answersEls).some(answerEl =>
        answerEl.parentElement && answerEl.parentElement.getAttribute('role') === 'listitem'
    );

    if (questionText) {
        formList[questionText] = {
            questionEl: questionEl,
            answers: answers,
            isMany: isMany
        };
    }
});

console.log(`Найдено ${Object.keys(formList).length} вопросов:`);
console.log(formList);

console.log(`Отправляется запрос чату. Подожди`);

importGptModule().then(({ processQuestions }) => {
    importCA().then(getCA => {
        caList = getCA;
        updateQuestionTitles(formList, caList);
    })

    processQuestions(formList).then((result) => {
        answersList = result;

        importAPModule().then(({ processAnswers }) => {
            processAnswers(answersList)
        })
    });
})

function updateQuestionTitles(parsedQuestions, caList) {
    for (let questionText in parsedQuestions) {
        const questionData = parsedQuestions[questionText];

        const matchingQuestion = caList.answers.find((item) =>
            item.question.includes(questionText)
        );

        if (matchingQuestion) {
            const correctAnswerText = matchingQuestion.answer;
            questionData.questionEl.title = `CAFile:\n${correctAnswerText}`;

            questionData.answers.forEach((answer) => {
                if (correctAnswerText.includes(answer.text))
                    answer.element.style.cursor = "progress";
            });
        }
    }

    console.log("Ответы из файла подгружены");
}
