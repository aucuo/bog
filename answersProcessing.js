export function processAnswers(answersList) {
    answersList.forEach(item => {
        item.questionEl.title = `${item.questionEl.title}\n\nGPT Answer:\n${item.correctAnswers}`;
    })

    console.log("Ответы от GPT");
    console.log(answersList);
}