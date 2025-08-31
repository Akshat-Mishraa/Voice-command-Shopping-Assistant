class VoiceShoppingAssistant {
    constructor() {
        // Product data and categories
        this.productData = {
            categories: {
                dairy: { icon: '🥛', items: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs'] },
                produce: { icon: '🥬', items: ['apples', 'bananas', 'oranges', 'lettuce', 'tomatoes', 'onions', 'carrots', 'broccoli'] },
                meat: { icon: '🥩', items: ['chicken', 'beef', 'pork', 'fish', 'turkey', 'bacon'] },
                pantry: { icon: '🍞', items: ['bread', 'rice', 'pasta', 'flour', 'sugar', 'salt', 'oil'] },
                beverages: { icon: '☕', items: ['water', 'juice', 'soda', 'coffee', 'tea'] },
                frozen: { icon: '🧊', items: ['ice cream', 'frozen vegetables', 'frozen pizza'] },
                snacks: { icon: '🍿', items: ['chips', 'crackers', 'nuts', 'cookies'] }
            },
            products: new Map([
                ['milk', { category: 'dairy', price: 3.99, alternatives: ['almond milk', 'oat milk'], seasonal: false }],
                ['bread', { category: 'pantry', price: 2.49, alternatives: ['bagels', 'rolls'], seasonal: false }],
                ['apples', { category: 'produce', price: 1.99, alternatives: ['pears', 'oranges'], seasonal: true }],
                ['chicken', { category: 'meat', price: 5.99, alternatives: ['turkey', 'fish'], seasonal: false }],
                ['yogurt', { category: 'dairy', price: 4.99, alternatives: ['greek yogurt'], seasonal: false }],
                // Add more products...
            ]),
            commonPairs: {
                'milk': ['cereal', 'cookies'],
                'bread': ['butter', 'jam'],
                'pasta': ['sauce', 'cheese'],
                'chicken': ['rice', 'vegetables']
            }
        };

        // Application state
        this.shoppingList = new Map();
        this.isListening = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.currentLanguage = 'en-US';
        this.voiceFeedbackEnabled = true;

        // Initialize the application
        this.init();
    }

    init() {
        this.setupSpeechRecognition();
        this.setupEventListeners();
        this.renderShoppingList();
        this.updateSuggestions();
        this.updateStatus('Ready');
    }

    setupSpeechRecognition() {
        // Check for Web Speech API support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError('Speech recognition not supported in this browser');
            return;
        }

        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLanguage;

        // Speech recognition event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicrophoneState('listening');
            this.updateStatus('Listening...');
            this.updateVoiceStatus('Listening...');
        };

        this.recognition.onresult = (event) => {
            let transcript = '';
            let isFinal = false;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    isFinal = true;
                }
            }

            this.displayRecognizedText(transcript);

            if (isFinal) {
                this.processVoiceCommand(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.handleSpeechError(event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateMicrophoneState('idle');
            this.updateStatus('Ready');
            this.updateVoiceStatus('Tap to speak');
        };
    }

    setupEventListeners() {
        // Microphone button
        const micBtn = document.getElementById('microphoneBtn');
        micBtn.addEventListener('click', () => this.toggleListening());

        // Clear list button
        const clearBtn = document.getElementById('clearListBtn');
        clearBtn.addEventListener('click', () => this.clearShoppingList());

        // Settings button and panel
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const closeSettings = document.getElementById('closeSettings');

        settingsBtn.addEventListener('click', () => settingsPanel.classList.add('open'));
        closeSettings.addEventListener('click', () => settingsPanel.classList.remove('open'));

        // Language selection
        const languageSelect = document.getElementById('languageSelect');
        languageSelect.addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            if (this.recognition) {
                this.recognition.lang = this.currentLanguage;
            }
        });

        // Voice feedback toggle
        const voiceFeedbackToggle = document.getElementById('voiceFeedback');
        voiceFeedbackToggle.addEventListener('change', (e) => {
            this.voiceFeedbackEnabled = e.target.checked;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.ctrlKey) {
                e.preventDefault();
                this.toggleListening();
            }
        });
    }

    toggleListening() {
        if (!this.recognition) return;

        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                this.handleSpeechError('not-allowed');
            }
        }
    }

    processVoiceCommand(transcript) {
        const command = transcript.toLowerCase().trim();
        this.updateMicrophoneState('processing');
        this.updateStatus('Processing...');

        // Command parsing and execution
        setTimeout(() => {
            if (this.isAddCommand(command)) {
                this.handleAddCommand(command);
            } else if (this.isRemoveCommand(command)) {
                this.handleRemoveCommand(command);
            } else if (this.isSearchCommand(command)) {
                this.handleSearchCommand(command);
            } else if (this.isClearCommand(command)) {
                this.clearShoppingList();
            } else if (this.isListCommand(command)) {
                this.readShoppingList();
            } else {
                this.handleUnknownCommand(command);
            }
        }, 500);
    }

    isAddCommand(command) {
        const addKeywords = ['add', 'i need', 'put', 'include', 'get', 'buy'];
        return addKeywords.some(keyword => command.includes(keyword));
    }

    isRemoveCommand(command) {
        const removeKeywords = ['remove', 'delete', 'take out', 'take off'];
        return removeKeywords.some(keyword => command.includes(keyword));
    }

    isSearchCommand(command) {
        const searchKeywords = ['find', 'search', 'look for', 'show me'];
        return searchKeywords.some(keyword => command.includes(keyword));
    }

    isClearCommand(command) {
        return command.includes('clear') || command.includes('empty') || command.includes('delete all');
    }

    isListCommand(command) {
        const listKeywords = ['what\'s on my list', 'read my list', 'show my list'];
        return listKeywords.some(keyword => command.includes(keyword));
    }

    handleAddCommand(command) {
        const { item, quantity } = this.extractItemAndQuantity(command);
        
        if (item) {
            this.addToShoppingList(item, quantity);
            this.displayCommandResult(`Added ${quantity > 1 ? quantity + ' ' : ''}${item} to your list`);
            this.speakFeedback(`Added ${item} to your shopping list`);
        } else {
            this.displayCommandResult('Sorry, I couldn\'t understand what item to add');
            this.speakFeedback('Please specify an item to add');
        }
    }

    handleRemoveCommand(command) {
        const item = this.extractItemName(command.replace(/remove|delete|take out|take off/gi, '').trim());
        
        if (item && this.shoppingList.has(item)) {
            this.removeFromShoppingList(item);
            this.displayCommandResult(`Removed ${item} from your list`);
            this.speakFeedback(`Removed ${item} from your shopping list`);
        } else if (item) {
            this.displayCommandResult(`${item} is not in your list`);
            this.speakFeedback(`${item} is not in your shopping list`);
        } else {
            this.displayCommandResult('Please specify an item to remove');
            this.speakFeedback('Please specify an item to remove');
        }
    }

    handleSearchCommand(command) {
        const searchTerm = this.extractSearchTerm(command);
        const results = this.searchProducts(searchTerm);
        
        this.displaySearchResults(results);
        this.displayCommandResult(`Found ${results.length} results for "${searchTerm}"`);
        this.speakFeedback(`Found ${results.length} products matching ${searchTerm}`);
    }

    handleUnknownCommand(command) {
        this.displayCommandResult('Sorry, I didn\'t understand that command');
        this.speakFeedback('Please try saying add, remove, search, or clear');
    }

    extractItemAndQuantity(command) {
        // Remove command words
        let cleanCommand = command.replace(/add|i need|put|include|get|buy/gi, '').trim();
        
        // Extract quantity
        const quantityMatch = cleanCommand.match(/(\d+)\s+(.+)/);
        let quantity = 1;
        let item = cleanCommand;

        if (quantityMatch) {
            quantity = parseInt(quantityMatch[1]);
            item = quantityMatch[2];
        }

        // Clean up item name
        item = item.replace(/bottles? of|cans? of|pieces? of|loaves? of/gi, '').trim();
        
        return { item: this.findClosestProduct(item), quantity };
    }

    extractItemName(text) {
        return this.findClosestProduct(text.trim());
    }

    extractSearchTerm(command) {
        return command.replace(/find|search|look for|show me/gi, '').trim();
    }

    findClosestProduct(input) {
        // Direct match
        const directMatch = Array.from(this.productData.products.keys())
            .find(product => product.toLowerCase() === input.toLowerCase());
        
        if (directMatch) return directMatch;

        // Partial match
        const partialMatch = Array.from(this.productData.products.keys())
            .find(product => 
                product.toLowerCase().includes(input.toLowerCase()) || 
                input.toLowerCase().includes(product.toLowerCase())
            );
        
        return partialMatch || input;
    }

    addToShoppingList(item, quantity = 1) {
        if (this.shoppingList.has(item)) {
            const existingItem = this.shoppingList.get(item);
            this.shoppingList.set(item, { ...existingItem, quantity: existingItem.quantity + quantity });
        } else {
            const category = this.getItemCategory(item);
            this.shoppingList.set(item, { quantity, category });
        }
        
        this.renderShoppingList();
        this.updateSuggestions();
    }

    removeFromShoppingList(item) {
        this.shoppingList.delete(item);
        this.renderShoppingList();
        this.updateSuggestions();
    }

    clearShoppingList() {
        this.shoppingList.clear();
        this.renderShoppingList();
        this.updateSuggestions();
        this.displayCommandResult('Shopping list cleared');
        this.speakFeedback('Shopping list cleared');
    }

    getItemCategory(item) {
        for (const [category, data] of Object.entries(this.productData.categories)) {
            if (data.items.includes(item.toLowerCase())) {
                return category;
            }
        }
        return 'other';
    }

    searchProducts(searchTerm) {
        const results = [];
        
        // Search in product names
        for (const [productName, productInfo] of this.productData.products) {
            if (productName.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push({
                    name: productName,
                    category: productInfo.category,
                    price: productInfo.price
                });
            }
        }
        
        // Search in categories
        for (const [category, data] of Object.entries(this.productData.categories)) {
            if (category.toLowerCase().includes(searchTerm.toLowerCase())) {
                data.items.forEach(item => {
                    if (!results.find(r => r.name === item)) {
                        const productInfo = this.productData.products.get(item);
                        if (productInfo) {
                            results.push({
                                name: item,
                                category: productInfo.category,
                                price: productInfo.price
                            });
                        }
                    }
                });
            }
        }

        return results.slice(0, 12); // Limit results
    }

    renderShoppingList() {
        const listContainer = document.getElementById('shoppingList');
        
        if (this.shoppingList.size === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p>Your shopping list is empty</p>
                    <p class="empty-state__hint">Try saying "Add milk" or "I need bread"</p>
                </div>
            `;
            return;
        }

        // Group items by category
        const categorizedItems = {};
        for (const [item, info] of this.shoppingList) {
            if (!categorizedItems[info.category]) {
                categorizedItems[info.category] = [];
            }
            categorizedItems[info.category].push({ name: item, ...info });
        }

        // Render categorized list
        let html = '';
        for (const [category, items] of Object.entries(categorizedItems)) {
            const categoryData = this.productData.categories[category] || { icon: '📦' };
            html += `
                <div class="category">
                    <h3 class="category-title">
                        <span class="category-icon">${categoryData.icon}</span>
                        ${this.capitalizeFirst(category)}
                    </h3>
                    <div class="category-items">
                        ${items.map(item => `
                            <div class="list-item">
                                <div class="item-info">
                                    <span class="item-name">${this.capitalizeFirst(item.name)}</span>
                                    <span class="item-quantity">Quantity: ${item.quantity}</span>
                                </div>
                                <button class="remove-item" onclick="app.removeFromShoppingList('${item.name}')">
                                    Remove
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        listContainer.innerHTML = html;
    }

    updateSuggestions() {
        const suggestionsContainer = document.querySelector('.suggestion-items');
        const suggestions = this.generateSuggestions();
        
        let html = '';
        suggestions.forEach(suggestion => {
            html += `
                <div class="suggestion-item" onclick="app.addToShoppingList('${suggestion.name}')">
                    <div class="suggestion-info">
                        <div class="suggestion-name">${this.capitalizeFirst(suggestion.name)}</div>
                        <div class="suggestion-reason">${suggestion.reason}</div>
                    </div>
                    <button class="add-suggestion" onclick="event.stopPropagation(); app.addToShoppingList('${suggestion.name}')">
                        Add
                    </button>
                </div>
            `;
        });

        if (html === '') {
            html = '<p class="empty-state__hint">Add items to get personalized suggestions</p>';
        }

        suggestionsContainer.innerHTML = html;
    }

    generateSuggestions() {
        const suggestions = [];
        
        // Based on current items
        for (const [item] of this.shoppingList) {
            const pairs = this.productData.commonPairs[item] || [];
            pairs.forEach(pairedItem => {
                if (!this.shoppingList.has(pairedItem)) {
                    suggestions.push({
                        name: pairedItem,
                        reason: `Goes well with ${item}`
                    });
                }
            });
        }

        // Seasonal suggestions
        const seasonalItems = ['apples', 'oranges', 'pumpkin'];
        seasonalItems.forEach(item => {
            if (!this.shoppingList.has(item)) {
                suggestions.push({
                    name: item,
                    reason: 'Seasonal favorite'
                });
            }
        });

        // Popular items
        const popularItems = ['milk', 'bread', 'eggs'];
        popularItems.forEach(item => {
            if (!this.shoppingList.has(item)) {
                suggestions.push({
                    name: item,
                    reason: 'Popular choice'
                });
            }
        });

        // Remove duplicates and limit
        const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
            index === self.findIndex(s => s.name === suggestion.name)
        );

        return uniqueSuggestions.slice(0, 6);
    }

    displaySearchResults(results) {
        const searchResultsSection = document.getElementById('searchResults');
        const contentContainer = searchResultsSection.querySelector('.search-results__content');
        
        if (results.length === 0) {
            contentContainer.innerHTML = '<p class="empty-state__hint">No products found</p>';
        } else {
            let html = '';
            results.forEach(result => {
                html += `
                    <div class="search-result-item" onclick="app.addToShoppingList('${result.name}')">
                        <div class="result-name">${this.capitalizeFirst(result.name)}</div>
                        <div class="result-category">${this.capitalizeFirst(result.category)}</div>
                        <div class="result-price">$${result.price}</div>
                    </div>
                `;
            });
            contentContainer.innerHTML = html;
        }
        
        searchResultsSection.style.display = 'block';
        setTimeout(() => {
            searchResultsSection.style.display = 'none';
        }, 10000); // Hide after 10 seconds
    }

    readShoppingList() {
        if (this.shoppingList.size === 0) {
            this.speakFeedback('Your shopping list is empty');
            return;
        }

        let listText = 'Your shopping list contains: ';
        for (const [item, info] of this.shoppingList) {
            listText += `${info.quantity > 1 ? info.quantity + ' ' : ''}${item}, `;
        }
        
        this.speakFeedback(listText);
    }

    // UI Helper Methods
    updateMicrophoneState(state) {
        const micBtn = document.getElementById('microphoneBtn');
        micBtn.className = `microphone-btn ${state}`;
    }

    updateStatus(status) {
        const statusIndicator = document.getElementById('statusIndicator');
        statusIndicator.textContent = status;
        
        // Update status color based on content
        statusIndicator.className = 'status';
        if (status.includes('Listening')) {
            statusIndicator.classList.add('status--warning');
        } else if (status.includes('Processing')) {
            statusIndicator.classList.add('status--info');
        } else if (status.includes('Ready')) {
            statusIndicator.classList.add('status--success');
        }
    }

    updateVoiceStatus(status) {
        document.getElementById('voiceStatus').textContent = status;
    }

    displayRecognizedText(text) {
        document.getElementById('recognizedText').textContent = text;
    }

    displayCommandResult(result) {
        const commandResultElement = document.getElementById('commandResult');
        commandResultElement.textContent = result;
        
        // Clear after 5 seconds
        setTimeout(() => {
            commandResultElement.textContent = '';
        }, 5000);
    }

    speakFeedback(text) {
        if (!this.voiceFeedbackEnabled || !this.synthesis) return;

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        this.synthesis.speak(utterance);
    }

    handleSpeechError(error) {
        let message = 'Speech recognition error occurred';
        
        switch (error) {
            case 'not-allowed':
                message = 'Microphone access denied. Please allow microphone access.';
                break;
            case 'no-speech':
                message = 'No speech detected. Please try again.';
                break;
            case 'network':
                message = 'Network error. Please check your connection.';
                break;
        }
        
        this.updateStatus('Error');
        this.displayCommandResult(message);
        this.updateMicrophoneState('idle');
        this.updateVoiceStatus('Tap to speak');
    }

    showError(message) {
        this.updateStatus('Error');
        this.displayCommandResult(message);
        console.error(message);
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VoiceShoppingAssistant();
});

// Service Worker registration (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}