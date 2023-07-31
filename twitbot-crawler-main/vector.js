const natural = require('natural');
const { WordTokenizer } = natural;

// Load the pre-trained Word2Vec model
const word2vecModelPath = '/GoogleNews-vectors-negative300.bin';
const word2vec = natural.Word2VecLoader().load(word2vecModelPath);
natural.load('./GoogleNews-vectors-negative300.bin', (err) => {
  if (err) {
    console.error('Error loading Word2Vec model:', err);
  } else {
    // Tokenize text using WordTokenizer
    const tokenizer = new WordTokenizer();
    const text = 'This is a text'; // Replace with your text

    const tokens = tokenizer.tokenize(text);
    console.log('Tokens:', tokens);
  }
});

// function preprocessText(text) {
//     // Perform text preprocessing tasks like tokenization, stemming, etc.
//     // Example:
//     const tokenizer = new natural.WordTokenizer({ language: 'en' });
//     const tokens = tokenizer.tokenize(text);
//     // Return the preprocessed tokens or processed text as per your requirement.
//     return tokens;
//   }

 console.log( preprocessText("BTC213123today"))