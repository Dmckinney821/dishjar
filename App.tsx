import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, TextInput, Alert, Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useState, useEffect, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

const Drawer = createDrawerNavigator();

const CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat',
  'Pantry',
  'Spices',
  'Beverages',
  'Frozen',
  'Other'
];

// Add common ingredients for spell checking
const COMMON_INGREDIENTS = [
  'milk', 'pasta', 'rice', 'flour', 'sugar', 'salt', 'pepper', 'butter', 'eggs',
  'cheese', 'bread', 'chicken', 'beef', 'pork', 'fish', 'vegetables', 'fruits',
  'oil', 'vinegar', 'honey', 'yogurt', 'cream', 'sauce', 'spices', 'herbs'
];

const CUISINE_TYPES = [
  'American',
  'Chinese',
  'Mexican',
  'Italian',
  'Indian',
  'Greek',
  'Japanese',
  'Thai',
  'Mediterranean',
  'Other'
];

const MEAL_TYPES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Dessert'
];

interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  expirationDate: Date | null;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string;
  cuisine: string;
  mealType: string;
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  difficulty: 'Easy' | 'Medium' | 'Hard';
  servings: number;
}

interface OnlineRecipe {
  uri: string;
  label: string;
  image: string;
  source: string;
  url: string;
  yield: number;
  calories: number;
  totalWeight: number;
  ingredients: string[];
}

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  isChecked: boolean;
}

// Create a context for ingredients
const IngredientsContext = createContext<{
  ingredients: Ingredient[];
  setIngredients: (ingredients: Ingredient[]) => void;
  loadIngredients: () => Promise<void>;
}>({
  ingredients: [],
  setIngredients: () => {},
  loadIngredients: async () => {},
});

// Create a provider component
function IngredientsProvider({ children }: { children: React.ReactNode }) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const loadIngredients = async () => {
    try {
      const storedIngredients = await AsyncStorage.getItem('ingredients');
      if (storedIngredients) {
        const parsedIngredients = JSON.parse(storedIngredients).map((ing: Ingredient) => ({
          ...ing,
          expirationDate: ing.expirationDate ? new Date(ing.expirationDate) : null
        }));
        setIngredients(parsedIngredients);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load ingredients');
    }
  };

  useEffect(() => {
    loadIngredients();
  }, []);

  return (
    <IngredientsContext.Provider value={{ ingredients, setIngredients, loadIngredients }}>
      {children}
    </IngredientsContext.Provider>
  );
}

function AddIngredientScreen() {
  const { ingredients, setIngredients, loadIngredients } = useContext(IngredientsContext);
  const [newIngredient, setNewIngredient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const checkSpelling = (text: string) => {
    if (text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const matches = COMMON_INGREDIENTS.filter(ingredient => 
      ingredient.includes(text.toLowerCase()) || text.toLowerCase().includes(ingredient)
    );
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const addIngredient = async () => {
    if (!newIngredient.trim() || !quantity.trim()) {
      Alert.alert('Error', 'Please enter both ingredient name and quantity');
      return;
    }

    // Check for similar ingredients
    const similarIngredients = ingredients.filter(ing => 
      ing.name.toLowerCase().includes(newIngredient.toLowerCase()) || 
      newIngredient.toLowerCase().includes(ing.name.toLowerCase())
    );

    if (similarIngredients.length > 0) {
      Alert.alert(
        'Similar Ingredient Found',
        `Would you like to combine this with your existing ${similarIngredients[0].name}?`,
        [
          {
            text: 'No, Add as New',
            style: 'cancel',
            onPress: () => addNewIngredient()
          },
          {
            text: 'Yes, Combine',
            onPress: () => combineIngredients(similarIngredients[0])
          }
        ]
      );
    } else {
      addNewIngredient();
    }
  };

  const addNewIngredient = async () => {
    const newIngredientItem: Ingredient = {
      id: Date.now().toString(),
      name: newIngredient.trim(),
      quantity: quantity.trim(),
      unit: unit.trim() || 'units',
      category,
      expirationDate,
    };

    const updatedIngredients = [...ingredients, newIngredientItem];
    setIngredients(updatedIngredients);
    
    try {
      await AsyncStorage.setItem('ingredients', JSON.stringify(updatedIngredients));
      Alert.alert('Success', 'Ingredient added successfully');
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to save ingredient');
    }
  };

  const combineIngredients = async (existingIngredient: Ingredient) => {
    const totalQuantity = parseFloat(existingIngredient.quantity) + parseFloat(quantity);
    const updatedIngredients = ingredients.map(ing => 
      ing.id === existingIngredient.id 
        ? { ...ing, quantity: totalQuantity.toString() }
        : ing
    );
    
    setIngredients(updatedIngredients);
    try {
      await AsyncStorage.setItem('ingredients', JSON.stringify(updatedIngredients));
      Alert.alert('Success', `Combined with existing ${existingIngredient.name}`);
      resetForm();
    } catch (error) {
      Alert.alert('Error', 'Failed to combine ingredients');
    }
  };

  const resetForm = () => {
    setNewIngredient('');
    setQuantity('');
    setUnit('');
    setCategory('');
    setExpirationDate(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Ingredient Name</Text>
          <TextInput
            style={styles.ingredientInput}
            placeholder="Enter ingredient name"
            value={newIngredient}
            onChangeText={(text) => {
              setNewIngredient(text);
              checkSpelling(text);
            }}
          />

          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setNewIngredient(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.quantityContainer}>
            <View style={styles.quantityInputWrapper}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.quantityInput}
                placeholder="Amount"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.unitInputWrapper}>
              <Text style={styles.label}>Unit</Text>
              <TextInput
                style={styles.unitInput}
                placeholder="Unit"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>

          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.ingredientInput}
            placeholder="Enter category (e.g., Produce, Dairy, Meat)"
            value={category}
            onChangeText={setCategory}
          />

          <Text style={styles.label}>Expiration Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {expirationDate
                ? `Expires: ${expirationDate.toLocaleDateString()}`
                : 'Set Expiration Date'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={expirationDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setExpirationDate(selectedDate);
                }
              }}
            />
          )}

          <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
            <Text style={styles.addButtonText}>Add Ingredient</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ViewIngredientsScreen({ navigation }: { navigation: any }) {
  const { ingredients, setIngredients, loadIngredients } = useContext(IngredientsContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedForCombine, setSelectedForCombine] = useState<string[]>([]);
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editExpirationDate, setEditExpirationDate] = useState<Date | null>(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editName, setEditName] = useState('');
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);

  const localRecipes: Recipe[] = [
    {
      id: '1',
      name: 'Cheesy Pasta',
      ingredients: ['pasta', 'butter', 'parmesan', 'garlic', 'salt', 'pepper'],
      instructions: '1. Cook pasta according to package instructions\n2. Melt butter in a pan\n3. Add minced garlic and cook until fragrant\n4. Add cooked pasta and toss\n5. Add parmesan, salt, and pepper\n6. Stir until cheese is melted',
      cuisine: 'Italian',
      mealType: 'Dinner',
      prepTime: 10,
      cookTime: 15,
      difficulty: 'Easy',
      servings: 4
    },
    {
      id: '2',
      name: 'Garlic Butter Shrimp',
      ingredients: ['shrimp', 'butter', 'garlic', 'lemon', 'parsley', 'salt', 'pepper'],
      instructions: '1. Melt butter in a pan\n2. Add minced garlic and cook until fragrant\n3. Add shrimp and cook until pink\n4. Add lemon juice, parsley, salt, and pepper\n5. Serve hot',
      cuisine: 'Mediterranean',
      mealType: 'Dinner',
      prepTime: 15,
      cookTime: 10,
      difficulty: 'Easy',
      servings: 2
    },
    {
      id: '3',
      name: 'Simple Salad',
      ingredients: ['lettuce', 'tomato', 'cucumber', 'olive oil', 'vinegar', 'salt', 'pepper'],
      instructions: '1. Chop vegetables\n2. Mix olive oil, vinegar, salt, and pepper\n3. Toss vegetables with dressing\n4. Serve chilled',
      cuisine: 'Mediterranean',
      mealType: 'Lunch',
      prepTime: 10,
      cookTime: 0,
      difficulty: 'Easy',
      servings: 2
    }
  ];

  // Add useEffect to check for available recipes whenever ingredients change
  useEffect(() => {
    const checkAvailableRecipes = () => {
      const availableIngredients = ingredients.map(ing => ing.name.toLowerCase());
      const matchingRecipes = localRecipes.filter((recipe: Recipe) => 
        recipe.ingredients.every((ingredient: string) => 
          availableIngredients.some(available => 
            available.includes(ingredient.toLowerCase()) || 
            ingredient.toLowerCase().includes(available)
          )
        )
      );
      setAvailableRecipes(matchingRecipes);
    };

    checkAvailableRecipes();
  }, [ingredients]);

  const deleteIngredient = async (id: string) => {
    const updatedIngredients = ingredients.filter(ingredient => ingredient.id !== id);
    setIngredients(updatedIngredients);
    
    try {
      await AsyncStorage.setItem('ingredients', JSON.stringify(updatedIngredients));
      Alert.alert('Success', 'Ingredient deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete ingredient');
    }
  };

  const handleEditPress = (item: Ingredient) => {
    setEditingIngredient(item);
    setEditName(item.name);
    setEditQuantity(item.quantity);
    setEditUnit(item.unit);
    setEditCategory(item.category);
    setEditExpirationDate(item.expirationDate);
    setShowEditModal(true);
  };

  const updateIngredient = async () => {
    if (!editingIngredient) return;

    const updatedIngredient: Ingredient = {
      ...editingIngredient,
      name: editName,
      quantity: editQuantity,
      unit: editUnit,
      category: editCategory,
      expirationDate: editExpirationDate,
    };

    const updatedIngredients = ingredients.map(ingredient =>
      ingredient.id === editingIngredient.id ? updatedIngredient : ingredient
    );

    setIngredients(updatedIngredients);
    setShowEditModal(false);
    setEditingIngredient(null);
    
    try {
      await AsyncStorage.setItem('ingredients', JSON.stringify(updatedIngredients));
      Alert.alert('Success', 'Ingredient updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update ingredient');
    }
  };

  const toggleCombineSelection = (id: string) => {
    setSelectedForCombine(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const combineSelectedIngredients = async () => {
    if (selectedForCombine.length < 2) {
      Alert.alert('Error', 'Please select at least two ingredients to combine');
      return;
    }

    const selectedIngredients = ingredients.filter(ing => selectedForCombine.includes(ing.id));
    const firstIngredient = selectedIngredients[0];
    const totalQuantity = selectedIngredients.reduce((sum, ing) => {
      if (ing.unit.toLowerCase() === firstIngredient.unit.toLowerCase()) {
        return sum + parseFloat(ing.quantity);
      }
      return sum;
    }, 0);

    const newIngredient: Ingredient = {
      ...firstIngredient,
      quantity: totalQuantity.toString(),
      id: Date.now().toString(),
    };

    const updatedIngredients = [
      ...ingredients.filter(ing => !selectedForCombine.includes(ing.id)),
      newIngredient
    ];

    setIngredients(updatedIngredients);
    setSelectedForCombine([]);
    
    try {
      await AsyncStorage.setItem('ingredients', JSON.stringify(updatedIngredients));
      Alert.alert('Success', 'Ingredients combined successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to combine ingredients');
    }
  };

  const findMatchingRecipes = () => {
    const availableIngredients = ingredients.map(ing => ing.name.toLowerCase());
    
    // Find recipes that can be made with available ingredients
    const matchingRecipes = localRecipes.filter((recipe: Recipe) => {
      return recipe.ingredients.every((ingredient: string) => 
        availableIngredients.some(available => 
          available.includes(ingredient.toLowerCase()) || 
          ingredient.toLowerCase().includes(available)
        )
      );
    });

    if (matchingRecipes.length === 0) {
      Alert.alert(
        'No Recipes Found',
        'No recipes can be made with your current ingredients. Try adding more ingredients to your pantry.',
        [{ text: 'OK' }]
      );
    } else {
      // Navigate to the first matching recipe
      navigation.navigate('Recipes', {
        screen: 'RecipeScreen',
        params: { 
          initialRecipe: matchingRecipes[0],
          matchingRecipes: matchingRecipes 
        }
      });
    }
  };

  const filteredIngredients = ingredients.filter(ingredient => {
    return ingredient.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderIngredient = ({ item }: { item: Ingredient }) => (
    <TouchableOpacity
      style={[
        styles.ingredientItem,
        selectedForCombine.includes(item.id) && styles.selectedItem
      ]}
      onPress={() => handleEditPress(item)}
    >
      <View style={styles.ingredientTextContainer}>
        <Text style={styles.ingredientName}>{item.name}</Text>
        <Text style={styles.ingredientDetails}>
          {item.quantity} {item.unit}
        </Text>
        {item.expirationDate && (
          <Text style={styles.expirationDate}>
            Expires: {item.expirationDate.toLocaleDateString()}
          </Text>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.combineButton,
            selectedForCombine.includes(item.id) && styles.selectedCombineButton
          ]}
          onPress={() => toggleCombineSelection(item.id)}
        >
          <Text style={styles.combineButtonText}>
            {selectedForCombine.includes(item.id) ? 'Selected' : 'Combine'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteIngredient(item.id)}
        >
          <Text style={styles.deleteButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[
            styles.suggestRecipeButton,
            availableRecipes.length > 0 && styles.suggestRecipeButtonActive
          ]}
          onPress={findMatchingRecipes}
        >
          <MaterialCommunityIcons 
            name={availableRecipes.length > 0 ? "food" : "food-outline"} 
            size={24} 
            color={availableRecipes.length > 0 ? "#fff" : "#666"} 
          />
          <Text style={[
            styles.suggestRecipeButtonText,
            availableRecipes.length > 0 && styles.suggestRecipeButtonTextActive
          ]}>
            Suggest Recipe {availableRecipes.length > 0 && `(${availableRecipes.length} available)`}
          </Text>
          {availableRecipes.length > 0 && (
            <View style={styles.recipeIndicator}>
              <MaterialCommunityIcons name="exclamation" size={16} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        {selectedForCombine.length >= 2 && (
          <TouchableOpacity
            style={styles.combineSelectedButton}
            onPress={combineSelectedIngredients}
          >
            <Text style={styles.combineSelectedButtonText}>
              Combine Selected ({selectedForCombine.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredIngredients}
        renderItem={renderIngredient}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Ingredient</Text>
            
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.ingredientInput}
              placeholder="Ingredient name"
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.label}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TextInput
                style={styles.quantityInput}
                placeholder="Amount"
                value={editQuantity}
                onChangeText={setEditQuantity}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.unitInput}
                placeholder="Unit"
                value={editUnit}
                onChangeText={setEditUnit}
              />
            </View>

            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.ingredientInput}
              placeholder="Enter category (e.g., Produce, Dairy, Meat)"
              value={editCategory}
              onChangeText={setEditCategory}
            />

            <Text style={styles.label}>Expiration Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEditDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {editExpirationDate
                  ? `Expires: ${editExpirationDate.toLocaleDateString()}`
                  : 'Set Expiration Date'}
              </Text>
            </TouchableOpacity>

            {showEditDatePicker && (
              <DateTimePicker
                value={editExpirationDate || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEditDatePicker(false);
                  if (selectedDate) {
                    setEditExpirationDate(selectedDate);
                  }
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={updateIngredient}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RecipeScreen() {
  const { ingredients } = useContext(IngredientsContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);

  const localRecipes: Recipe[] = [
    {
      id: '1',
      name: 'Cheesy Pasta',
      ingredients: ['pasta', 'butter', 'parmesan', 'garlic', 'salt', 'pepper'],
      instructions: '1. Cook pasta according to package instructions\n2. Melt butter in a pan\n3. Add minced garlic and cook until fragrant\n4. Add cooked pasta and toss\n5. Add parmesan, salt, and pepper\n6. Stir until cheese is melted',
      cuisine: 'Italian',
      mealType: 'Dinner',
      prepTime: 10,
      cookTime: 15,
      difficulty: 'Easy',
      servings: 4
    },
    {
      id: '2',
      name: 'Garlic Butter Shrimp',
      ingredients: ['shrimp', 'butter', 'garlic', 'lemon', 'parsley', 'salt', 'pepper'],
      instructions: '1. Melt butter in a pan\n2. Add minced garlic and cook until fragrant\n3. Add shrimp and cook until pink\n4. Add lemon juice, parsley, salt, and pepper\n5. Serve hot',
      cuisine: 'Mediterranean',
      mealType: 'Dinner',
      prepTime: 15,
      cookTime: 10,
      difficulty: 'Easy',
      servings: 2
    },
    {
      id: '3',
      name: 'Simple Salad',
      ingredients: ['lettuce', 'tomato', 'cucumber', 'olive oil', 'vinegar', 'salt', 'pepper'],
      instructions: '1. Chop vegetables\n2. Mix olive oil, vinegar, salt, and pepper\n3. Toss vegetables with dressing\n4. Serve chilled',
      cuisine: 'Mediterranean',
      mealType: 'Lunch',
      prepTime: 10,
      cookTime: 0,
      difficulty: 'Easy',
      servings: 2
    }
  ];

  useEffect(() => {
    const checkAvailableRecipes = () => {
      const availableIngredients = ingredients.map(ing => ing.name.toLowerCase());
      const matchingRecipes = localRecipes.filter((recipe: Recipe) => 
        recipe.ingredients.every((ingredient: string) => 
          availableIngredients.some(available => 
            available.includes(ingredient.toLowerCase()) || 
            ingredient.toLowerCase().includes(available)
          )
        )
      );
      setAvailableRecipes(matchingRecipes);
    };

    checkAvailableRecipes();
  }, [ingredients]);

  const filteredRecipes = availableRecipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCuisine = !selectedCuisine || recipe.cuisine === selectedCuisine;
    const matchesMealType = !selectedMealType || recipe.mealType === selectedMealType;
    return matchesSearch && matchesCuisine && matchesMealType;
  });

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const canMake = true; // Since we're already filtering available recipes
    return (
      <View style={[styles.recipeItem, !canMake && styles.recipeItemUnavailable]}>
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeName}>{item.name}</Text>
          <View style={styles.recipeTags}>
            <View style={styles.recipeTag}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#666" />
              <Text style={styles.recipeTagText}>{item.prepTime + item.cookTime} min</Text>
            </View>
            <View style={styles.recipeTag}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={14} color="#666" />
              <Text style={styles.recipeTagText}>{item.servings} servings</Text>
            </View>
            <View style={styles.recipeTag}>
              <MaterialCommunityIcons name="chef-hat" size={14} color="#666" />
              <Text style={styles.recipeTagText}>{item.difficulty}</Text>
            </View>
          </View>
        </View>
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeCuisine}>{item.cuisine} • {item.mealType}</Text>
        </View>
        <Text style={styles.recipeSubtitle}>Ingredients:</Text>
        <View style={styles.ingredientTags}>
          {item.ingredients.map((ingredient, index) => (
            <View 
              key={index} 
              style={[
                styles.ingredientTag,
                ingredients.some(ing => 
                  ing.name.toLowerCase().includes(ingredient.toLowerCase()) || 
                  ingredient.toLowerCase().includes(ing.name.toLowerCase())
                ) ? styles.availableIngredient : styles.missingIngredient
              ]}
            >
              <Text style={styles.ingredientTagText}>{ingredient}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.recipeSubtitle}>Instructions:</Text>
        <Text style={styles.recipeInstructions}>{item.instructions}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes or ingredients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Cuisine:</Text>
          <View style={styles.filterOptions}>
            {CUISINE_TYPES.map((cuisine) => (
              <TouchableOpacity
                key={cuisine}
                style={[
                  styles.filterOption,
                  selectedCuisine === cuisine && styles.selectedFilterOption
                ]}
                onPress={() => setSelectedCuisine(selectedCuisine === cuisine ? '' : cuisine)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedCuisine === cuisine && styles.selectedFilterOptionText
                ]}>
                  {cuisine}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterLabel}>Meal Type:</Text>
          <View style={styles.filterOptions}>
            {MEAL_TYPES.map((mealType) => (
              <TouchableOpacity
                key={mealType}
                style={[
                  styles.filterOption,
                  selectedMealType === mealType && styles.selectedFilterOption
                ]}
                onPress={() => setSelectedMealType(selectedMealType === mealType ? '' : mealType)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedMealType === mealType && styles.selectedFilterOptionText
                ]}>
                  {mealType}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <FlatList
        data={filteredRecipes}
        renderItem={renderRecipe}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function OnlineRecipesScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<OnlineRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      const storedIngredients = await AsyncStorage.getItem('ingredients');
      if (storedIngredients) {
        const parsedIngredients = JSON.parse(storedIngredients).map((ing: Ingredient) => ({
          ...ing,
          expirationDate: ing.expirationDate ? new Date(ing.expirationDate) : null
        }));
        setIngredients(parsedIngredients);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load ingredients');
    }
  };

  const searchRecipes = async () => {
    if (ingredients.length === 0) {
      Alert.alert('Error', 'Please add some ingredients to your pantry first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In a real app, you would use your Edamam API key here
      const APP_ID = 'YOUR_APP_ID';
      const APP_KEY = 'YOUR_APP_KEY';
      
      const ingredientList = ingredients.map(ing => ing.name).join(',');
      const response = await fetch(
        `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(ingredientList)}&app_id=${APP_ID}&app_key=${APP_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }

      const data = await response.json();
      setRecipes(data.hits.map((hit: any) => hit.recipe));
    } catch (err) {
      setError('Failed to fetch recipes. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderRecipe = ({ item }: { item: OnlineRecipe }) => (
    <View style={styles.recipeItem}>
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeName}>{item.label}</Text>
        <Text style={styles.recipeSource}>{item.source}</Text>
      </View>
      <Text style={styles.recipeSubtitle}>Ingredients:</Text>
      <View style={styles.ingredientTags}>
        {item.ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientTag}>
            <Text style={styles.ingredientTagText}>{ingredient}</Text>
          </View>
        ))}
      </View>
      <View style={styles.recipeStats}>
        <Text style={styles.recipeStat}>Servings: {item.yield}</Text>
        <Text style={styles.recipeStat}>Calories: {Math.round(item.calories)}</Text>
      </View>
      <TouchableOpacity
        style={styles.viewRecipeButton}
        onPress={() => {
          // In a real app, you would open the recipe URL
          Alert.alert('View Recipe', 'This would open the recipe in a browser');
        }}
      >
        <Text style={styles.viewRecipeButtonText}>View Full Recipe</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for recipes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={searchRecipes}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search Recipes</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={recipes}
        renderItem={renderRecipe}
        keyExtractor={item => item.uri}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function ShoppingListScreen() {
  const { ingredients } = useContext(IngredientsContext);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = async () => {
    try {
      const storedList = await AsyncStorage.getItem('shoppingList');
      if (storedList) {
        setShoppingList(JSON.parse(storedList));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load shopping list');
    }
  };

  const saveShoppingList = async (list: ShoppingListItem[]) => {
    try {
      await AsyncStorage.setItem('shoppingList', JSON.stringify(list));
    } catch (error) {
      Alert.alert('Error', 'Failed to save shopping list');
    }
  };

  const addItem = async () => {
    if (!newItem.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    const newShoppingItem: ShoppingListItem = {
      id: Date.now().toString(),
      name: newItem.trim(),
      quantity: quantity.trim() || '1',
      unit: unit.trim() || 'units',
      category: category || 'Other',
      isChecked: false,
    };

    const updatedList = [...shoppingList, newShoppingItem];
    setShoppingList(updatedList);
    await saveShoppingList(updatedList);
    setNewItem('');
    setQuantity('');
    setUnit('');
    setCategory('');
  };

  const toggleItem = async (id: string) => {
    const updatedList = shoppingList.map(item =>
      item.id === id ? { ...item, isChecked: !item.isChecked } : item
    );
    setShoppingList(updatedList);
    await saveShoppingList(updatedList);
  };

  const deleteItem = async (id: string) => {
    const updatedList = shoppingList.filter(item => item.id !== id);
    setShoppingList(updatedList);
    await saveShoppingList(updatedList);
  };

  const checkSpelling = (text: string) => {
    if (text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const matches = COMMON_INGREDIENTS.filter(ingredient => 
      ingredient.includes(text.toLowerCase()) || text.toLowerCase().includes(ingredient)
    );
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const moveToPantry = async (item: ShoppingListItem) => {
    const newIngredient: Ingredient = {
      id: Date.now().toString(),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expirationDate: null,
    };

    const { ingredients: currentIngredients, setIngredients } = useContext(IngredientsContext);
    const updatedIngredients = [...currentIngredients, newIngredient];
    setIngredients(updatedIngredients);
    
    try {
      await AsyncStorage.setItem('ingredients', JSON.stringify(updatedIngredients));
      await deleteItem(item.id);
      Alert.alert('Success', 'Item moved to pantry');
    } catch (error) {
      Alert.alert('Error', 'Failed to move item to pantry');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.ingredientInput}
          placeholder="Add new item..."
          value={newItem}
          onChangeText={(text) => {
            setNewItem(text);
            checkSpelling(text);
          }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => {
                  setNewItem(suggestion);
                  setShowSuggestions(false);
                }}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.quantityContainer}>
          <TextInput
            style={styles.quantityInput}
            placeholder="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.unitInput}
            placeholder="Unit"
            value={unit}
            onChangeText={setUnit}
          />
        </View>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={category}
            style={styles.picker}
            onValueChange={(itemValue) => setCategory(itemValue as string)}
            dropdownIconColor="#666"
          >
            <Picker.Item label="Select Category" value="" />
            {CATEGORIES.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={addItem}>
          <Text style={styles.addButtonText}>Add to Shopping List</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={shoppingList}
        renderItem={({ item }) => (
          <View style={styles.shoppingItem}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleItem(item.id)}
            >
              <MaterialCommunityIcons
                name={item.isChecked ? "checkbox-marked" : "checkbox-blank-outline"}
                size={24}
                color={item.isChecked ? "#4CAF50" : "#666"}
              />
            </TouchableOpacity>
            <View style={styles.shoppingItemDetails}>
              <Text style={[
                styles.shoppingItemName,
                item.isChecked && styles.checkedItem
              ]}>
                {item.name}
              </Text>
              <Text style={styles.shoppingItemQuantity}>
                {item.quantity} {item.unit}
              </Text>
              <Text style={styles.shoppingItemCategory}>
                {item.category}
              </Text>
            </View>
            <View style={styles.shoppingItemActions}>
              <TouchableOpacity
                style={styles.moveToPantryButton}
                onPress={() => moveToPantry(item)}
              >
                <MaterialCommunityIcons name="fridge" size={24} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteItem(item.id)}
              >
                <MaterialCommunityIcons name="delete" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function WhatsForDinnerScreen() {
  const { ingredients } = useContext(IngredientsContext);
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [localRecipes] = useState<Recipe[]>([
    {
      id: '1',
      name: 'Spaghetti Carbonara',
      ingredients: ['spaghetti', 'eggs', 'bacon', 'parmesan cheese', 'black pepper'],
      instructions: '1. Cook spaghetti\n2. Fry bacon\n3. Mix eggs and cheese\n4. Combine all ingredients',
      cuisine: 'Italian',
      mealType: 'Dinner',
      prepTime: 10,
      cookTime: 20,
      difficulty: 'Medium',
      servings: 4
    },
    {
      id: '2',
      name: 'Chicken Stir Fry',
      ingredients: ['chicken breast', 'bell peppers', 'soy sauce', 'garlic', 'ginger', 'rice'],
      instructions: '1. Cook rice\n2. Stir fry chicken\n3. Add vegetables\n4. Add sauce',
      cuisine: 'Asian',
      mealType: 'Dinner',
      prepTime: 15,
      cookTime: 15,
      difficulty: 'Easy',
      servings: 4
    },
    {
      id: '3',
      name: 'Greek Salad',
      ingredients: ['cucumber', 'tomatoes', 'red onion', 'feta cheese', 'olives', 'olive oil'],
      instructions: '1. Chop vegetables\n2. Add feta and olives\n3. Dress with olive oil',
      cuisine: 'Mediterranean',
      mealType: 'Lunch',
      prepTime: 15,
      cookTime: 0,
      difficulty: 'Easy',
      servings: 2
    }
  ]);

  useEffect(() => {
    loadShoppingList();
  }, []);

  const loadShoppingList = async () => {
    try {
      const storedList = await AsyncStorage.getItem('shoppingList');
      if (storedList) {
        setShoppingList(JSON.parse(storedList));
      }
    } catch (error) {
      console.error('Error loading shopping list:', error);
    }
  };

  const addToShoppingList = async (missingIngredients: string[]) => {
    const newItems = missingIngredients.map(ingredient => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: ingredient,
      quantity: '1',
      unit: 'units',
      category: 'Other',
      isChecked: false,
    }));

    const updatedList = [...shoppingList, ...newItems];
    setShoppingList(updatedList);
    
    try {
      await AsyncStorage.setItem('shoppingList', JSON.stringify(updatedList));
      Alert.alert('Success', 'Ingredients added to shopping list!');
    } catch (error) {
      console.error('Error saving shopping list:', error);
      Alert.alert('Error', 'Failed to add ingredients to shopping list');
    }
  };

  const getMissingIngredients = (recipe: Recipe) => {
    const availableIngredients = ingredients.map(ing => ing.name.toLowerCase());
    return recipe.ingredients.filter(ingredient => 
      !availableIngredients.some(available => 
        available.includes(ingredient.toLowerCase()) || 
        ingredient.toLowerCase().includes(available)
      )
    );
  };

  const getSuggestions = () => {
    setLoading(true);
    const availableIngredients = ingredients.map(ing => ing.name.toLowerCase());
    
    // Filter recipes based on available ingredients and preferences
    const matchingRecipes = localRecipes.filter((recipe: Recipe) => {
      // Check if recipe matches selected filters
      const matchesCuisine = !selectedCuisine || recipe.cuisine === selectedCuisine;
      const matchesMealType = !selectedMealType || recipe.mealType === selectedMealType;
      
      // Check if we have enough ingredients
      const hasEnoughIngredients = recipe.ingredients.every((ingredient: string) => 
        availableIngredients.some(available => 
          available.includes(ingredient.toLowerCase()) || 
          ingredient.toLowerCase().includes(available)
        )
      );

      return matchesCuisine && matchesMealType && hasEnoughIngredients;
    });

    // Sort recipes by:
    // 1. Number of matching ingredients (more is better)
    // 2. Total cooking time (shorter is better)
    const sortedRecipes = matchingRecipes.sort((a: Recipe, b: Recipe) => {
      const aMatches = a.ingredients.filter((ing: string) => 
        availableIngredients.some(avail => 
          avail.includes(ing.toLowerCase()) || ing.toLowerCase().includes(avail)
        )
      ).length;
      
      const bMatches = b.ingredients.filter((ing: string) => 
        availableIngredients.some(avail => 
          avail.includes(ing.toLowerCase()) || ing.toLowerCase().includes(avail)
        )
      ).length;

      if (aMatches !== bMatches) {
        return bMatches - aMatches; // More matches first
      }
      
      return (a.prepTime + a.cookTime) - (b.prepTime + b.cookTime); // Shorter time first
    });

    setSuggestedRecipes(sortedRecipes);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>What's for Dinner?</Text>
        <Text style={styles.subtitle}>Find recipes based on your pantry</Text>
      </View>
      
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Cuisine:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
          <View style={styles.filterOptions}>
            {CUISINE_TYPES.map((cuisine) => (
              <TouchableOpacity
                key={cuisine}
                style={[
                  styles.filterOption,
                  selectedCuisine === cuisine && styles.selectedFilterOption
                ]}
                onPress={() => setSelectedCuisine(selectedCuisine === cuisine ? '' : cuisine)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedCuisine === cuisine && styles.selectedFilterOptionText
                ]}>
                  {cuisine}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.filterLabel}>Meal Type:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
          <View style={styles.filterOptions}>
            {MEAL_TYPES.map((mealType) => (
              <TouchableOpacity
                key={mealType}
                style={[
                  styles.filterOption,
                  selectedMealType === mealType && styles.selectedFilterOption
                ]}
                onPress={() => setSelectedMealType(selectedMealType === mealType ? '' : mealType)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedMealType === mealType && styles.selectedFilterOptionText
                ]}>
                  {mealType}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Finding perfect recipes...</Text>
        </View>
      ) : (
        <ScrollView style={styles.recipesContainer}>
          {suggestedRecipes.map((recipe) => {
            const missingIngredients = getMissingIngredients(recipe);
            return (
              <View key={recipe.id} style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <Text style={styles.recipeName}>{recipe.name}</Text>
                  <View style={styles.recipeMeta}>
                    <View style={styles.recipeMetaItem}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                      <Text style={styles.recipeMetaText}>{recipe.prepTime + recipe.cookTime} min</Text>
                    </View>
                    <View style={styles.recipeMetaItem}>
                      <MaterialCommunityIcons name="silverware-fork-knife" size={16} color="#666" />
                      <Text style={styles.recipeMetaText}>{recipe.servings} servings</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.recipeTags}>
                  <View style={styles.recipeTag}>
                    <Text style={styles.recipeTagText}>{recipe.cuisine}</Text>
                  </View>
                  <View style={styles.recipeTag}>
                    <Text style={styles.recipeTagText}>{recipe.mealType}</Text>
                  </View>
                  <View style={styles.recipeTag}>
                    <Text style={styles.recipeTagText}>{recipe.difficulty}</Text>
                  </View>
                </View>

                <Text style={styles.recipeIngredientsTitle}>Ingredients:</Text>
                <View style={styles.ingredientTags}>
                  {recipe.ingredients.map((ingredient, index) => {
                    const isAvailable = ingredients.some(ing => 
                      ing.name.toLowerCase().includes(ingredient.toLowerCase()) || 
                      ingredient.toLowerCase().includes(ing.name.toLowerCase())
                    );
                    return (
                      <View 
                        key={index} 
                        style={[
                          styles.ingredientTag,
                          isAvailable ? styles.availableIngredient : styles.missingIngredient
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name={isAvailable ? "check-circle" : "alert-circle"} 
                          size={16} 
                          color={isAvailable ? "#4CAF50" : "#F44336"} 
                        />
                        <Text style={styles.ingredientText}>{ingredient}</Text>
                      </View>
                    );
                  })}
                </View>

                {missingIngredients.length > 0 && (
                  <View style={styles.missingIngredientsContainer}>
                    <View style={styles.missingIngredientsHeader}>
                      <MaterialCommunityIcons name="cart-plus" size={20} color="#E65100" />
                      <Text style={styles.missingIngredientsTitle}>Missing Ingredients</Text>
                    </View>
                    <View style={styles.missingIngredientsList}>
                      {missingIngredients.map((ingredient, index) => (
                        <View key={index} style={styles.missingIngredientItem}>
                          <MaterialCommunityIcons name="circle-small" size={16} color="#E65100" />
                          <Text style={styles.missingIngredientText}>{ingredient}</Text>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={styles.addToShoppingListButton}
                      onPress={() => addToShoppingList(missingIngredients)}
                    >
                      <MaterialCommunityIcons name="cart-plus" size={20} color="#fff" />
                      <Text style={styles.addToShoppingListButtonText}>
                        Add to Shopping List
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.recipeInstructionsTitle}>Instructions:</Text>
                <Text style={styles.recipeInstructions}>{recipe.instructions}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <IngredientsProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Drawer.Navigator
              initialRouteName="Add Ingredient"
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#4CAF50',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                drawerStyle: {
                  backgroundColor: '#fff',
                  width: 240,
                },
                drawerActiveTintColor: '#4CAF50',
                drawerInactiveTintColor: '#666',
              }}
            >
              <Drawer.Screen 
                name="Add Ingredient" 
                component={AddIngredientScreen}
                options={{
                  title: 'Add New Ingredient',
                  drawerIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="plus-circle" size={size} color={color} />
                  ),
                }}
              />
              <Drawer.Screen 
                name="View Pantry" 
                component={ViewIngredientsScreen}
                options={{
                  title: 'My Pantry',
                  drawerIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="food-apple" size={size} color={color} />
                  ),
                }}
              />
              <Drawer.Screen 
                name="Shopping List" 
                component={ShoppingListScreen}
                options={{
                  title: 'Shopping List',
                  drawerIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="cart" size={size} color={color} />
                  ),
                }}
              />
              <Drawer.Screen 
                name="Recipes" 
                component={RecipeScreen}
                options={{
                  title: 'My Recipes',
                  drawerIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />
                  ),
                }}
              />
              <Drawer.Screen 
                name="Online Recipes" 
                component={OnlineRecipesScreen}
                options={{
                  title: 'Find Recipes',
                  drawerIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="web" size={size} color={color} />
                  ),
                }}
              />
              <Drawer.Screen 
                name="What's for Dinner?" 
                component={WhatsForDinnerScreen}
                options={{
                  title: "What's for Dinner?",
                  drawerIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="food" size={size} color={color} />
                  ),
                }}
              />
            </Drawer.Navigator>
          </NavigationContainer>
        </IngredientsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  ingredientInput: {
    height: 56,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionsContainer: {
    marginTop: -15,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 16,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  quantityContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  quantityInputWrapper: {
    flex: 2,
  },
  unitInputWrapper: {
    flex: 1,
  },
  quantityInput: {
    height: 56,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unitInput: {
    height: 56,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateButton: {
    height: 56,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  ingredientItem: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  ingredientTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  ingredientName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  ingredientDetails: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 8,
  },
  expirationDate: {
    fontSize: 15,
    color: '#FF3B30',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  recipeItem: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  recipeItemUnavailable: {
    opacity: 0.7,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recipeName: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    color: '#1a1a1a',
  },
  recipeTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  recipeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recipeTagText: {
    fontSize: 12,
    color: '#666',
  },
  recipeInfo: {
    marginTop: 8,
  },
  recipeCuisine: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  recipeSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  ingredientTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  availableIngredient: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  missingIngredient: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  ingredientTagText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    height: 56,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  selectedItem: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  combineButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    marginRight: 12,
  },
  selectedCombineButton: {
    backgroundColor: '#0055D5',
  },
  combineButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  combineSelectedButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    margin: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  combineSelectedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  suggestRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  suggestRecipeButtonActive: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  suggestRecipeButtonText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  suggestRecipeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  recipeIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  recipeSource: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  recipeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e6e6e6',
  },
  recipeStat: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  viewRecipeButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  viewRecipeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterScrollView: {
    marginBottom: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    paddingRight: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedFilterOption: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterOptionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFilterOptionText: {
    color: '#fff',
  },
  timeInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1a1a1a',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  recipesContainer: {
    flex: 1,
  },
  recipeCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recipeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeMetaText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  recipeDifficulty: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },
  recipeServings: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  recipeIngredientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  shoppingItemDetails: {
    flex: 1,
  },
  shoppingItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  checkedItem: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  shoppingItemQuantity: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recipeInstructions: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 24,
  },
  recipeInstructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  ingredientText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  shoppingItemCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  shoppingItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  moveToPantryButton: {
    padding: 8,
  },
  missingIngredientsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  missingIngredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  missingIngredientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
  },
  missingIngredientsList: {
    marginBottom: 16,
  },
  missingIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  missingIngredientText: {
    fontSize: 14,
    color: '#E65100',
  },
  addToShoppingListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  addToShoppingListButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  missingIngredientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
  },
  missingIngredientsList: {
    marginBottom: 16,
  },
  missingIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  missingIngredientText: {
    fontSize: 14,
    color: '#E65100',
  },
});
