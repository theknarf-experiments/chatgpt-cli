// QuickSearch taken from: https://github.com/Eximchain/ink-quicksearch-input/blob/master/src/QuickSearchInput.tsx
import React, {
	useState,
	useEffect,
	useRef,
	useMemo,
	PropsWithChildren
} from 'react';
import { useStdin, Text, Box, useInput } from 'ink';
import chalk from 'chalk';
import hasAnsi from 'has-ansi';
import isEqual from 'lodash.isequal';
// @ts-ignore This module makes stdin emit keypress events,
// that's it.  Hasn't been published in six years, no types
// available.
import keypress from 'keypress';

type IsSelected = PropsWithChildren<{
    isSelected: boolean
}>

type ItemProps = {
    item: TItem
    isHighlighted: boolean | undefined
} & IsSelected;

// For the following four, whitespace is important
const Indicator = ({ isSelected } : IsSelected) => {
    return <Text color="#00FF00">{isSelected ? '>' : ' '} </Text>;
};

const Item = ({ isSelected, children } : IsSelected) => (
    <Text color={isSelected ? '#00FF00' : ''}>{children}</Text>
);

const Highlight = ({ children } : PropsWithChildren<{}>) => (
    <Text backgroundColor="#6C71C4">{children}</Text>
);

const Status = ({ hasMatch, children } : PropsWithChildren<{ hasMatch: boolean }>) => (
    <Text>{'/'}<Text color='#74BEFF'>{children}</Text></Text>
);

interface TItem {
	label: string
	value?: string | number
}

interface KeyPress {
	name: string
	sequence: string
	shift: boolean
}

interface QuickSearchProps {
	onSelect: (item: TItem) => void;
	items: TItem[];
	focus?: boolean;
	caseSensitive?: boolean;
	limit?: number;
	forceMatchingQuery?: boolean;
	clearQueryChars?: string[];
}

const QuickSearch = ({
		onSelect,
		items,
    focus = true,
    caseSensitive = false,
    limit = 0,
    forceMatchingQuery = true,
    clearQueryChars = [
        '\u0015', // Ctrl + U
        '\u0017', // Ctrl + W
    ],
} : QuickSearchProps) => {
    const [windowIndices, setWindowIndices] = useState({
        selection: 0,
        start: 0
    })
    const [query, setQuery] = useState('');
    const getValue = () => {
        return matchingItems[windowIndices.selection] || { label: '' };
    }

    const getMatchIndex = (label: string, query: string) => {
        return caseSensitive ?
            label.indexOf(query) :
            label.toLowerCase().indexOf(query.toLowerCase())
    }

    const getMatchingItems = (alternateQuery?: string) => {
        const matchQuery = alternateQuery || query;
        if (matchQuery === '') return items;
        return items.filter(item => getMatchIndex(item.label, matchQuery) >= 0);
    }

    const matchingItems = useMemo(() => {
        return getMatchingItems();
    }, [items, query]);
    const usingLimitedView = limit !== 0 && matchingItems.length > limit;

    const inkStdin = useStdin();
    useEffect(() => {
        keypress(inkStdin.stdin);
        if (inkStdin.isRawModeSupported) inkStdin.setRawMode(true);
        inkStdin.stdin.addListener('keypress', handleKeyPress)
        return () => {
            inkStdin.stdin.removeListener('keypress', handleKeyPress);
            if (inkStdin.isRawModeSupported) inkStdin.setRawMode(false);
        }
    }, [inkStdin, query, items, windowIndices])

    const itemRef = useRef(items);
    useEffect(() => {
        if (!isEqual(items, itemRef.current)) {
            itemRef.current = items;
            setWindowIndices({
                selection: 0, start: 0
            })
            setQuery('');
        }
    }, [items])

    const removeCharFromQuery = () => {
        setQuery((query) => query.slice(0, -1) as string)
    }

    const addCharToQuery = (newChar: string) => {
        setQuery((query) => {
            let newQuery = query + newChar;
            let newMatching = getMatchingItems(newQuery);
            if (newMatching.length === 0 && forceMatchingQuery) {
                return query;
            } else {
                setWindowIndices({ start: 0, selection: 0 })
                return newQuery
            }
        })
    }

    const selectUp = () => {
        setWindowIndices((windowIndices) => {
            const { selection, start } = windowIndices;
            let newSelection = selection;
            let newStart = start;
            if (selection === 0) {
                // Wrap around to the bottom
                newSelection = matchingItems.length - 1;
                if (usingLimitedView) {
                    newStart = matchingItems.length - limit;
                }
            } else {
                // Go up, potentially moving up window, unless
                // it is already 0.
                newSelection -= 1;
                if (usingLimitedView) {
                    if (selection - start <= 1 && start > 0) {
                        newStart -= 1;
                    }
                }
            }
            return {
                selection: newSelection,
                start: newStart
            }
        })
    }

    const selectDown = () => {
        setWindowIndices(({ start, selection }) => {
            let newStart = start;
            let newSelection = selection;
            if (selection === matchingItems.length - 1) {
                // Wrap around to the top
                newSelection = 0;
                if (newStart !== 0) newStart = 0;
            } else {
                // Go down, potentially moving window
                newSelection++;
                if (limit && matchingItems.length > limit && newSelection - newStart >= limit - 1) {
                    newStart += 1;
                }
            }
            return {
                start: newStart,
                selection: newSelection
            }
        })
    }

    const handleKeyPress = (ch: string, key: KeyPress) => {
        if (!focus) return;
        if (!key && parseInt(ch) !== NaN) {
            addCharToQuery(ch);
            return;
        }
        if (clearQueryChars.indexOf(ch) !== -1) {
            setQuery('');
        } else if (key.name === 'return') {
            onSelect(getValue());
        } else if (key.name === 'backspace') {
            removeCharFromQuery();
        } else if (key.name === 'up') {
            selectUp();
        } else if (key.name === 'down') {
            selectDown();
        } else if (key.name === 'tab') {
            if (key.shift === false) {
                selectDown();
            } else {
                selectUp();
            }
        } else if (hasAnsi(key.sequence)) {
            // Ignore fancy Ansi escape codes
        } else {
            addCharToQuery(ch);
        }
    }

    const begin = windowIndices.start;
    let end = items.length;
    if (limit !== 0) end = Math.min(begin + limit, items.length);
    const visibleItems = matchingItems.slice(begin, end);

    return (
        <Box key='quicksearch-input' flexDirection='column'>
            <Box key='status-label'>
                <Status hasMatch={visibleItems.length > 0}>
                    {query}
                </Status>
            </Box>
            {
                visibleItems.length === 0 ?

                    <Box key='no-items-found'>No matches</Box> :

                    visibleItems.map((item) => {
                        const isSelected = matchingItems.indexOf(item) === windowIndices.selection;
                        const isHighlighted = undefined;
                        const itemProps: ItemProps = { isSelected, isHighlighted, item };
                        const label = item.label;

                        const queryStart = getMatchIndex(label, query);
                        const queryEnd = queryStart + query.length;
                        let labelComponent;
                        itemProps.isHighlighted = true;
                        const preMatch = label.slice(0, queryStart);
                        const match = label.slice(queryStart, queryEnd);
                        const postMatch = label.slice(queryEnd);
                        labelComponent = (
                            <Text>{preMatch}<Highlight>{match}</Highlight>{postMatch}</Text>
                        )
                        return (
                            <Box flexDirection='row' key={`item-${item.label}`}>
                                <Item {...itemProps}>
                                    <Indicator {...itemProps} />
                                    {labelComponent}
                                </Item>
                            </Box>
                        )
                    })
            }
            {
                !usingLimitedView ? null : (
                    <Box key='num-visible-items'>
                        <HighlightComponent>Viewing {begin}-{end} of {matchingItems.length} matching items ({items.length} items overall)</HighlightComponent>
                    </Box>
                )
            }
        </Box>
    )
}

// Copied from https://github.com/vadimdemedes/ink-text-input/blob/master/source/index.tsx
type TextInputProps = {
	/**
	 * Value to display in a text input.
	 */
	value: string;

	/**
	 * Function to call when value updates.
	 */
	onChange: (value: string) => void;

	/**
	 * Function to call when `Enter` is pressed, where first argument is a value of the input.
	 */
	onSubmit?: (value: string) => void;
};

function TextInput({
	value: originalValue,
	onChange,
	onSubmit
}: TextInputProps) {

	const placeholder = '';
	const focus = true;
	const highlightPastedText = false;
	const showCursor = true;

	const [state, setState] = useState({
		cursorOffset: (originalValue || '').length,
		cursorWidth: 0
	});

	const {cursorOffset, cursorWidth} = state;

	useEffect(() => {
		setState(previousState => {
			if (!focus || !showCursor) {
				return previousState;
			}

			const newValue = originalValue || '';

			if (previousState.cursorOffset > newValue.length - 1) {
				return {
					cursorOffset: newValue.length,
					cursorWidth: 0
				};
			}

			return previousState;
		});
	}, [originalValue, focus, showCursor]);

	const cursorActualWidth = highlightPastedText ? cursorWidth : 0;

	const value = originalValue;
	let renderedValue = value;
	let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

	// Fake mouse cursor, because it's too inconvenient to deal with actual cursor and ansi escapes
	if (showCursor && focus) {
		renderedPlaceholder =
			placeholder.length > 0
				? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1))
				: chalk.inverse(' ');

		renderedValue = value.length > 0 ? '' : chalk.inverse(' ');

		let i = 0;

		for (const char of value) {
			renderedValue +=
				i >= cursorOffset - cursorActualWidth && i <= cursorOffset
					? chalk.inverse(char)
					: char;

			i++;
		}

		if (value.length > 0 && cursorOffset === value.length) {
			renderedValue += chalk.inverse(' ');
		}
	}

	useInput(
		(input : string, key : any) => {
			if (
				key.upArrow ||
				key.downArrow ||
				(key.ctrl && input === 'c') ||
				key.tab ||
				(key.shift && key.tab)
			) {
				return;
			}

			if (key.return) {
				if (onSubmit) {
					onSubmit(originalValue);
				}

				return;
			}

			let nextCursorOffset = cursorOffset;
			let nextValue = originalValue;
			let nextCursorWidth = 0;

			if (key.leftArrow) {
				if (showCursor) {
					nextCursorOffset--;
				}
			} else if (key.rightArrow) {
				if (showCursor) {
					nextCursorOffset++;
				}
			} else if (key.backspace || key.delete) {
				if (cursorOffset > 0) {
					nextValue =
						originalValue.slice(0, cursorOffset - 1) +
						originalValue.slice(cursorOffset, originalValue.length);

					nextCursorOffset--;
				}
			} else {
				nextValue =
					originalValue.slice(0, cursorOffset) +
					input +
					originalValue.slice(cursorOffset, originalValue.length);

				nextCursorOffset += input.length;

				if (input.length > 1) {
					nextCursorWidth = input.length;
				}
			}

			if (cursorOffset < 0) {
				nextCursorOffset = 0;
			}

			if (cursorOffset > originalValue.length) {
				nextCursorOffset = originalValue.length;
			}

			setState({
				cursorOffset: nextCursorOffset,
				cursorWidth: nextCursorWidth
			});

			if (nextValue !== originalValue) {
				onChange(nextValue);
			}
		},
		{isActive: focus}
	);

	return (
		<Text>
			{placeholder
				? value.length > 0
					? renderedValue
					: renderedPlaceholder
				: renderedValue}
		</Text>
	);
}

// CompletionInput
export interface Command {
	value: number;
	label: string;
};

export interface Props {
	onSubmit : Function;
	slashCommands : Command[];
}

export const CompletionInput = ({
	onSubmit,
	slashCommands,
} : Props) => {
	const [value, setValue] = useState('');
	const handleSubmit = (content : String) => {
		onSubmit(content);
		setValue("");
	};

	if(value.match(/^\//)) {
		return <>
			<Text>{"> "}</Text>
			<QuickSearch
				items={slashCommands}
				onSelect={(item) => {
					setValue(item.value);
				}} />
		</>
	}

	return <>
		<Text>{"> "}</Text>
		<TextInput
			value={value}
			onChange={setValue}
			onSubmit={handleSubmit}
		/>
	</>
};
