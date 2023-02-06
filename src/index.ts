
import $ from "jquery";

const TokenKind = {
    LeftBrace: "{",
    RightBrace: "}",
    VerticalBar: "|",
    Others: "others"
} as const;

type TokenKind = typeof TokenKind[keyof typeof TokenKind];

class Token {
    kind: TokenKind;
    fragment: string | null;

    constructor(kind: TokenKind, fragment: string | null = null) {
        this.kind = kind;
        this.fragment = fragment;
    }
};


function lexer(question: string): Token[] {
    let result: Token[] = [];
    let previous_token_end_index = 0;
    for (let i = 0; i < question.length; ++i) {
        if (TokenKind.LeftBrace === question.charAt(i)) {
            result.push(new Token("others", question.substring(previous_token_end_index, i)));
            result.push(new Token("{"));
            previous_token_end_index = i + TokenKind.LeftBrace.length;
        } else if (TokenKind.RightBrace === question.charAt(i)) {
            result.push(new Token("others", question.substring(previous_token_end_index, i)));
            result.push(new Token("}"));
            previous_token_end_index = i + TokenKind.RightBrace.length;
        } else if (TokenKind.VerticalBar === question.charAt(i)) {
            result.push(new Token("others", question.substring(previous_token_end_index, i)));
            result.push(new Token("|"));
            previous_token_end_index = i + TokenKind.VerticalBar.length;
        }
    }
    if (previous_token_end_index !== question.length - 1) {
        result.push(new Token("others", question.substring(previous_token_end_index)));
    }
    return result;
}

class DisplayType {
    display: string;
    underline: boolean;

    constructor(display: string, underline: boolean = false) {
        this.display = display;
        this.underline = underline;
    }
};

function parser(tokens: Token[]): [DisplayType[], string[]] {
    let question: DisplayType[] = [];
    let answer: string[] = [];

    for (let i = 0; i < tokens.length;) {
        if (tokens[i].kind === TokenKind.LeftBrace) {  // {
            ++i;

            // expected yomi
            const yomi = tokens[i++].fragment!;
            question.push(new DisplayType(yomi, true));

            // expected |
            ++i;

            // expected kaki
            const kaki = tokens[i++].fragment!;
            answer.push(kaki);

            // expected }
            ++i;
        } else {
            question.push(new DisplayType(tokens[i++].fragment!));
        }
    }
    return [question, answer];
}


enum Colors {
    Black,
    White,
    Transparent,
    Red
};

function colorToStyle(color: Colors): string {
    const BlackStyle = "rgba(0, 0, 0, 1.0)";
    const WhiteStyle = "rgba(255, 255, 255, 1.0)";
    const TransparentStyle = "rgba(255, 255, 255, 0.0)";
    const RedStyle = "rgba(255, 0, 0, 1.0)";
    if (color === Colors.Black) {
        return BlackStyle;
    } else if (color === Colors.White) {
        return WhiteStyle;
    } else if (color === Colors.Transparent) {
        return TransparentStyle;
    } else if (color === Colors.Red) {
        return RedStyle;
    } else {
        // unreachable
        return BlackStyle;
    }
}

const [Width, Height] = [600, 600];
const NumQuestion = 10;
const StringPx = 20;
const WhiteStyle = "rgba(255, 255, 255, 1.0)";
const BlackStyle = "rgba(0, 0, 0, 1.0)";
const RedStyle = "rgba(255, 0, 0, 1.0)";
const TransparentStyle = "rgba(255, 255, 255, 0.0)";


((numQuestion: number) => {
    $("#inputs").append(`
        <tr>
            <th scope="row" contenteditable="false">設定</th>
            <td>
                <div>
                    文字色
                    <select id="question-color" class="form-select">
                        <option selected value="${Colors.Black}">黒</option>
                        <option value="${Colors.White}">白</option>
                        <option value="${Colors.Transparent}">透明</option>
                    </select>
                </div>
                <div>
                    背景色
                    <select id="background-color" class="form-select">
                        <option value="${Colors.Black}">黒</option>
                        <option value="${Colors.White}">白</option>
                        <option selected value="${Colors.Transparent}">透明</option>
                    </select>
                </div>
                <div>
                    解答色
                    <select id="answer-color" class="form-select">
                        <option value="${Colors.Black}">黒</option>
                        <option selected value="${Colors.White}">白</option>
                        <option value="${Colors.Transparent}">透明</option>
                    </select>
                </div>
            </td>
        </tr>

                        `)
    for (let i = 1; i <= numQuestion; ++i) {
        $("#inputs").append(`
            <tr>
                <th scope="row" contenteditable="false">${i}</th>
                <td class="question" contenteditable="true"></td>
            </tr>
        `);
    }
})(NumQuestion);

$("#download-button").click(() => {
    const canvas = document.getElementById("result")! as HTMLCanvasElement;
    canvas.width = Width;
    canvas.height = Height;
    const context = canvas.getContext("2d")!;
    context.font = `${StringPx}px sans-serif`;

    const questionColor = colorToStyle(parseInt($("#question-color").val() as string));
    const backgroundColor = colorToStyle(parseInt($("#background-color").val() as string));
    const answerColor = colorToStyle(parseInt($("#answer-color").val() as string));

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, Width, Height);

    let positionY = StringPx;
    $("td.question").each((index, element) => {
        const tokens = lexer($(element).text());
        let [question, answer] = parser(tokens);

        let startX = 0;
        const questionNumberText = `${index + 1}. `;
        context.fillStyle = questionColor;
        context.fillText(questionNumberText, startX, positionY);
        startX = context.measureText(questionNumberText).width;

        for (let i = 0; i < question.length; ++i) {
            const textWidth = context.measureText(question[i].display).width;
            if (question[i].underline) {
                context.strokeStyle = questionColor;
                context.fillText(question[i].display, startX, positionY);

                context.strokeStyle = RedStyle;
                context.beginPath();
                context.moveTo(startX, positionY);
                context.lineTo(startX + textWidth, positionY);
                context.stroke();
            } else {
                context.fillStyle = questionColor;
                context.fillText(question[i].display, startX, positionY);
            }
            startX += textWidth;
        }
        positionY += StringPx;

        const answerStartText = "(   ";
        const answerEndText = "   )";
        const answerSplitText = "   ,   ";

        startX = 0;
        context.fillStyle = questionColor;
        context.fillText(answerStartText, startX, positionY);
        startX = context.measureText(answerStartText).width;
        for (let i = 0; i < answer.length; ++i) {
            console.log(context.globalCompositeOperation);

            // erase
            context.globalCompositeOperation = "destination-out";
            context.fillText(answer[i], startX, positionY);

            // write
            context.globalCompositeOperation = "source-over";
            context.fillStyle = answerColor;
            context.fillText(answer[i], startX, positionY);
            startX += context.measureText(answer[i]).width;

            context.fillStyle = questionColor;
            context.fillText(answerSplitText, startX, positionY);
            startX += context.measureText(answerSplitText).width;
        }
        context.fillStyle = questionColor;
        context.fillText(answerEndText, startX, positionY);
        startX = context.measureText(answerEndText).width;

        positionY += StringPx;
        positionY += StringPx;
    });

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "kanji-drill.png";
    a.click();
});
