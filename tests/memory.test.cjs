const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createPlatformDb, ids} = require('./db-helper.cjs');

// 4x4 board: pairs sit side by side (cells 0-1, 2-3, ... 14-15) so matches are easy to script.
const pairs = ['us', 'cn', 'jp', 'kr', 'in', 'gb', 'fr', 'de'];
const seededDeck = pairs.flatMap(card => [card, card]);

test('Memory', async (t) => {
  const h = await createPlatformDb();
  const {db, asUser, room, act} = h;
  try {
    async function begin(options = {size: 4, genre: 'flags', showNames: true}) {
      const id = await h.lobby('memory', {options});
      await h.start(id);
      return id;
    }
    async function seed(id, deck = seededDeck) {
      await db.exec('reset role');
      await db.query("update public.game_private set data = jsonb_build_object('deck', $2::jsonb) where room_id = $1", [id, JSON.stringify(deck)]);
      await asUser(ids.host);
    }
    const flip = (id, i) => h.move(id, {i}, 'flip');
    const answerWith = (id, pick) => h.move(id, {pick}, 'answer');
    const deckOf = async (id) => {
      await db.exec('reset role');
      return (await db.query('select data from public.game_private where room_id = $1', [id])).rows[0].data.deck;
    };

    await t.test('the real deal is a shuffled set of pairs for every board size, and the deck stays private', async () => {
      for (const size of [4, 6, 8, 10]) {
        const id = await begin({size, genre: 'flags', showNames: true});
        const started = await room(id);
        assert.equal(started.state.board.length, size * size);
        assert.ok(started.state.board.every(c => c === null));
        assert.ok(started.state.owner.every(c => c === null));
        assert.deepEqual(started.state.scores, {[ids.host]: 0, [ids.guest]: 0});
        assert.ok(!JSON.stringify(started).includes('"deck"'));
        const deck = await deckOf(id);
        assert.equal(deck.length, size * size);
        const counts = deck.reduce((m, c) => m.set(c, (m.get(c) ?? 0) + 1), new Map());
        assert.equal(counts.size, size * size / 2);
        assert.ok([...counts.values()].every(n => n === 2));
        await asUser(ids.guest);
        await assert.rejects(db.query('select * from public.game_private'), /permission denied/);
      }
    });
    await t.test('defaults give a 6x6 flags game; bad options are refused when the game starts', async () => {
      const id = await h.lobby('memory');
      assert.deepEqual((await room(id)).options, {size: 6, genre: 'flags', showNames: true});
      for (const [options, message] of [
        [{size: 5}, /board size/], [{size: '4'}, /board size/], [{genre: 'nope'}, /card set/], [{showNames: 'yes'}, /show card names/],
      ]) {
        const bad = await h.lobby('memory', {options});
        await assert.rejects(h.start(bad), message);
      }
    });
    await t.test('matching keeps the turn, a miss passes it, and revealed cards clear on the next flip', async () => {
      const id = await begin();
      await seed(id);
      await asUser(ids.guest);
      await assert.rejects(act(id, 'flip', {i: 0}), /not your turn/);
      await asUser(ids.host);
      for (const bad of [-1, 16, 1.5, '1', null]) await assert.rejects(act(id, 'flip', {i: bad}), /Choose a card/);
      await assert.rejects(act(id, 'flip', {}), /Choose a card/);
      await assert.rejects(act(id, 'peek', {i: 0}), /Unknown action/);
      let r = await flip(id, 0);
      assert.equal(r.state.board[0], 'us');
      assert.deepEqual(r.state.up, [0]);
      await assert.rejects(act(id, 'flip', {i: 0}), /already face up/);
      r = await flip(id, 1);   // match
      assert.deepEqual(r.state.owner.slice(0, 2), [ids.host, ids.host]);
      assert.equal(r.state.scores[ids.host], 1);
      assert.deepEqual(r.state.shown, [0, 1]);
      assert.deepEqual(r.state.up, []);
      assert.equal(r.turn_index, 0);                       // match keeps the turn
      assert.deepEqual(r.state.board.slice(0, 2), ['us', 'us']);  // matched pair stays visible for now
      r = await flip(id, 2);                               // next flip: the match disappears
      assert.deepEqual(r.state.board.slice(0, 2), [null, null]);
      assert.deepEqual(r.state.shown, []);
      await assert.rejects(act(id, 'flip', {i: 0}), /already face up/);   // taken cards stay taken
      r = await flip(id, 4);                               // 'cn' vs 'jp': miss
      assert.equal(r.state.mismatch, true);
      assert.deepEqual(r.state.up, [2, 4]);
      assert.deepEqual([r.state.board[2], r.state.board[4]], ['cn', 'jp']);
      assert.equal(r.turn_index, 1);                       // miss passes the turn
      await asUser(ids.host);
      await assert.rejects(act(id, 'flip', {i: 5}), /not your turn/);
      r = await flip(id, 3);                               // guest's first flip hides the miss
      assert.deepEqual([r.state.board[2], r.state.board[4]], [null, null]);
      assert.equal(r.state.mismatch, false);
      r = await flip(id, 2);                               // guest matches cn
      assert.deepEqual([r.state.owner[2], r.state.owner[3]], [ids.guest, ids.guest]);
      assert.equal(r.state.scores[ids.guest], 1);
      assert.equal(r.turn_index, 1);
    });
    await t.test('taking every pair ends the game with the higher score as the winner', async () => {
      const id = await begin();
      await seed(id);
      for (let pair = 0; pair < 8; pair++) { await flip(id, pair * 2); await flip(id, pair * 2 + 1); }
      const r = await room(id);
      assert.equal(r.status, 'finished'); assert.equal(r.winner_id, ids.host);
      assert.equal(r.state.scores[ids.host], 8);
      await assert.rejects(act(id, 'flip', {i: 0}), /not in progress/);
    });
    await t.test('equal scores are a draw, and the host can rematch with a fresh shuffle', async () => {
      const id = await begin();
      await seed(id);
      for (let pair = 0; pair < 4; pair++) { await flip(id, pair * 2); await flip(id, pair * 2 + 1); }
      await flip(id, 8); await flip(id, 10);               // host misses on purpose
      for (let pair = 4; pair < 8; pair++) { await flip(id, pair * 2); await flip(id, pair * 2 + 1); }
      const r = await room(id);
      assert.equal(r.status, 'finished'); assert.equal(r.winner_id, null);
      assert.deepEqual(r.state.scores, {[ids.host]: 4, [ids.guest]: 4});
      await asUser(ids.host);
      assert.deepEqual((await act(id, 'reset')).state, {});
      await db.exec('reset role');
      assert.equal((await db.query('select * from public.game_private where room_id = $1', [id])).rows.length, 0);
      const again = await h.start(id);                      // rematch: a new shuffle with the same options
      assert.equal(again.status, 'playing');
      assert.equal((await deckOf(id)).length, 16);
    });
    await t.test('hard mode asks a four-choice question after each match worth a bonus point', async () => {
      const id = await begin({size: 4, genre: 'flags', showNames: false});
      await seed(id);
      await asUser(ids.host);
      await assert.rejects(act(id, 'answer', {pick: 'us'}), /no question/);
      await flip(id, 0);
      let r = await flip(id, 1);
      assert.equal(r.state.quiz.card, 'us');
      assert.equal(r.state.quiz.player_id, ids.host);
      assert.equal(r.state.quiz.options.length, 4);
      assert.equal(new Set(r.state.quiz.options).size, 4);
      assert.ok(r.state.quiz.options.includes('us'));
      assert.equal(r.status, 'playing');
      await assert.rejects(act(id, 'flip', {i: 2}), /Answer the flag question/);
      await assert.rejects(act(id, 'answer', {}), /Choose an answer/);
      await assert.rejects(act(id, 'answer', {pick: 'zz'}), /listed answers/);
      const wrong = r.state.quiz.options.find(o => o !== 'us');
      r = await answerWith(id, wrong);
      assert.equal(r.state.scores[ids.host], 1);           // pair only, no bonus
      assert.deepEqual(r.state.qres, {player_id: ids.host, correct: false, card: 'us'});
      assert.equal(r.state.quiz, null);
      assert.equal(r.turn_index, 0);
      for (let pair = 1; pair < 8; pair++) {
        await flip(id, pair * 2);
        r = await flip(id, pair * 2 + 1);
        assert.equal(r.state.quiz.card, pairs[pair]);
        assert.equal(r.status, 'playing');                 // not over until the last question is answered
        r = await answerWith(id, pairs[pair]);
        assert.equal(r.state.qres.correct, true);
      }
      assert.equal(r.status, 'finished'); assert.equal(r.winner_id, ids.host);
      assert.equal(r.state.scores[ids.host], 8 + 7);       // eight pairs plus seven correct answers
    });
  } finally { await db.close(); }
});
