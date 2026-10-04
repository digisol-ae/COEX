# Tests

- `npm run test:unit` needs no database and is fast.
- `npm run test:db` runs against a real MongoDB. Each file uses its own database named
  `coex_test_<suite>`; the helper refuses any other name.

## Making the database tests fast

Every database test clears and reseeds its database, which is dozens of queries. Against Atlas
each query is a network round trip, so a full run is slow and can time out. Run a MongoDB on your
own machine for tests and set, in `.env.local`:

    MONGODB_TEST_URI=mongodb://127.0.0.1:27017

On the Mac: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
(or `docker run -d -p 27017:27017 mongo:8`). When `MONGODB_TEST_URI` is unset the suite uses
`MONGODB_URI` as before. Setup hooks now allow 60 seconds, so a slow link no longer fails a file
whose tests pass alone.
