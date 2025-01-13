function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

export async function processQuestions(formList) {
    const apiKey = "твой ключара";
    const endpoint = "https://api.openai.com/v1/chat/completions";

    const questions = Object.entries(formList);
    const chunks = chunkArray(questions, 10);
    const answersList = [];

    for (const chunk of chunks) {
        let prompt = "Вы — помощник, который поможет решить тест на тему 'Цифровая обработка изображений'.\n";
        prompt += "Ниже представлен список вопросов и ответов к ним. Для каждого вопроса укажите номера правильных ответов через запятую в формате 1. 1, 2, 5 или 3. 1, 2 и т.д. БЕЗ ЛИШНЕЙ ИНФОРМАЦИИ\n\n";

        chunk.forEach(([question, { answers, isMany }], index) => {
            prompt += `${index + 1}. ${question}\n`;
            answers.forEach((answer, i) => {
                prompt += `  ${i + 1}. ${answer.text}\n`;
            });
            if (isMany)
                prompt += "  На этот вопрос может быть несколько правильных ответов.\n";
            else
                prompt += "  На этот вопрос может быть только 1 правильный ответ"
            prompt += "\n";
        });

        const requestBody = {
            model: "gpt-4",
            messages: [
                { role: "system", content: "Вы — помощник." },
                { role: "user", content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.7
        };

        try {
            // Отправляем запрос
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                console.error("Ошибка OpenAI API:", await response.text());
                continue;
            }

            const responseData = await response.json();
            const gptResponse = responseData.choices[0].message.content;

            console.log('GPT: Обработка чанка завершена');

            const lines = gptResponse.split("\n").filter(line => line.trim());
            lines.forEach(line => {
                const questionMatch = line.match(/^(\d+)\.\s(.*)$/); // Ищем строку вида "1. 1, 3"
                if (questionMatch) {
                    const questionIndex = parseInt(questionMatch[1], 10) - 1; // Извлекаем номер вопроса
                    if (!chunk[questionIndex]) {
                        console.warn(`Пропущен вопрос с индексом ${questionIndex + 1}`);
                        return;
                    }

                    const correctAnswerIndices = questionMatch[2]
                        .split(",")
                        .map(num => parseInt(num.trim(), 10) - 1)
                        .filter(index => !isNaN(index));

                    const originalQuestion = chunk[questionIndex];
                    const correctAnswers = correctAnswerIndices.map(index => {
                        const answer = originalQuestion[1].answers[index];
                        if (!answer) {
                            console.warn(`Не удалось найти ответ с индексом ${index + 1} для вопроса: ${originalQuestion[0]}`);
                            return null;
                        }
                        return answer.text;
                    }).filter(Boolean);

                    const correctAnswerElements = correctAnswerIndices.map(index => {
                        const answer = originalQuestion[1].answers[index];
                        if (!answer) {
                            console.warn(`Не удалось найти HTML-элемент для ответа с индексом ${index + 1}`);
                            return null;
                        }
                        return answer.element;
                    }).filter(Boolean);

                    answersList.push({
                        question: originalQuestion[0],
                        correctAnswers: correctAnswers,
                        elements: correctAnswerElements,
                        questionEl: originalQuestion[1].questionEl
                    });
                }
            });

        } catch (error) {
            console.error("Ошибка при отправке запроса:", error);
        }
    }

    return answersList;
}
