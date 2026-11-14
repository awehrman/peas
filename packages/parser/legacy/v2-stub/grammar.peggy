{ /* utils */
  function formatOutput(parsed = []) {
	const result = parsed
    	.filter(Boolean)
        .map((p) => p.values)
        .join(' ');
	return result;
  }

  function getIngredients(parsed = []) {
  	const result = parsed
    	.filter((p) => p.type === 'ingredient')
        .map((p) => p.values)
    return result;
  }
}

start =
  // 1 cup sliced apples, cored
  parsed:ingredientLine
    {
      return {
        input: text(parsed),
        output: formatOutput(parsed.values),
        ingredients: getIngredients(parsed.values),
        parsed: [parsed]
      };
    }

// RULES

ingredientLine "Ingredient Line" =
  // '1 apple'
  amt:amount* _* ing:ingredient
  {
  	/* strip out any empty values */
  	const values = [amt, ing].flatMap(value => value);
  	return {
    	rule: `#ORDER_ingredient_line`,
    	type: 'ingredient_line',
    	values
    };
  }

ingredient "Ingredient" =
  // apple
  ing:$(letter)+
  {
  	return {
    	rule: `#ORDER_ingredient`,
    	type: 'ingredient',
    	values: [ing.toLowerCase()]
    };
  }
  
amount "Amount" =
	// one
    amt:amountKeyword
    {
  		return {
    		rule: `#ORDER_amount >> ${amt.rule}`,
    		type: 'amount',
    		values: [...amt.values] // ...amt
    	};
  	}
    // 1
    / amt:digits
    {
      return {
        rule: `#ORDER_amount >> ${amt.rule}`,
        type: 'amount',
        values: [...amt.values]
      };
    }

digits "Digits" =
  digits:$([0-9])+
  {
    return {
      rule: `#ORDER_digits`,
      values: [digits]
    };
  }
    

// BASE RULES

_ "Whitespace" =
  [\t, \n, \r, ' ']
    {
      return ' ';
    }

letter "Letter" =
	[a-z]i
  

digit "Digit" =
  [0-9]

// DICTIONARIES

amountKeyword "Amount Keyword" =
  amt:$('quarter' / 'seventeen'i / 'thirteen'i  / 'numerous'i / 'nineteen'i / 'fourteen'i / 'eighteen'i / 'sixteen'i / 'several'i / 'seventy'i / 'hundred'i / 'fifteen'i / 'amounts'i / 'twenty'i / 'twelve'i / 'thirty'i / 'single'i / 'ninety'i / 'eleven'i / 'eighty'i / 'couple'i / 'amount'i / 'three'i / 'third'i / 'sixty'i / 'sixth'i / 'seven'i / 'forty'i / 'fifty'i / 'eight'i / 'dozen'i / 'some'i / 'nine'i / 'half'i / 'four'i / 'five'i / 'two'i / 'six'i / 'one'i / 'lot'i)
    {
	    return {
    		rule: `#ORDER_amount_keyword`,
    		values: [amt.toLowerCase()]
    	};
  	}
