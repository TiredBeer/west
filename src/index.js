import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Функция для проверки, является ли карта уткой
function isDuck(card) {
    return card && card.quacks && card.swims;
}

// Функция для проверки, является ли карта собакой
function isDog(card) {
    return card instanceof Dog;
}

// Функция для получения описания существа по схожести с утками и собаками
function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    return 'Существо';
}

// Базовый класс Creature, наследуемый от Card
class Creature extends Card {
    constructor(name, power) {
        super(name, power, null);
    }
}

// Переопределяем метод getDescriptions для Creature:
// Первая строка – описание из getCreatureDescription, вторая – базовое описание Card.
Creature.prototype.getDescriptions = function () {
    let arr = [];
    arr.push(getCreatureDescription(this));
    arr.push(Object.getPrototypeOf(Creature.prototype).getDescriptions.call(this));
    return arr;
}


// Карта-утка
class Duck extends Creature {
    constructor() {
        super('Мирная утка', 2);
    }
}

Duck.prototype.quacks = function () { console.log('quack') };
Duck.prototype.swims = function () { console.log('float: both;') };


class Dog extends Creature {
    constructor(name = 'Пес-бандит', pow = 3) {
        super(name, pow);
    }
}

// Карта Громила (Trasher)
class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }
    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        this.view.signalAbility(() => {super.modifyTakenDamage(value - 1, fromCard, gameContext, continuation); })
    };

    getDescriptions() {
        return ["-1 к получаемому урону", ...super.getDescriptions()];
    }
}

// ★ Новый тип карты: Gatling
// Наследуется от Creature. При атаке последовательно наносит 2 урона каждой карте противника.
class Gatling extends Creature {
    constructor() {
        super('Гатлинг', 6);
    }
    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        // Получаем все карты противника, которые находятся на столе
        const enemyCards = gameContext.oppositePlayer.table.filter(card => card != null);
        enemyCards.forEach(card => {
            taskQueue.push(onDone => {
                // Выполняем анимацию атаки
                this.view.showAttack(() => {});
                // Наносим 2 урона атакуемой карте
                this.dealDamageToCreature(2, card, gameContext, onDone);
            });
        });
        taskQueue.continueWith(continuation);
    }
}

class Lad extends Dog {
    constructor(name='Браток', pow=2) {
        super(name, pow);
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        const {currentPlayer, oppositePlayer, position, updateView} = gameContext;
        Lad.inGameCount += 1;
        continuation();
    }

    doBeforeRemoving(continuation) {
        Lad.inGameCount -= 1;
        continuation();
    }

    static getBonus() {
        return this.inGameCount * (this.inGameCount + 1) / 2;
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        continuation(value + (Lad.getBonus() || 0));
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        continuation(value - (Lad.getBonus() || 0));
    }

    getDescriptions() {
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature'))
            return ['Чем их больше, тем они сильнее', ...super.getDescriptions()]
        return super.getDescriptions()
    }
}

// Тестовые колоды для проверки работы карты Gatling
const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Gatling(),
];
const banditStartDeck = [
    new Trasher(),
    new Lad(),
    new Lad(),
    new Lad(),
];

// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект для управления скоростью анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
