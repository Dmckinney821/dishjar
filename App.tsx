import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, TextInput, Alert, Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

function AddIngredientScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

function ViewIngredientsScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
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

  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || ingredient.category === selectedCategory;
    return matchesSearch && matchesCategory;
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
        <Text style={styles.ingredientCategory}>{item.category}</Text>
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
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryLabel}>Category:</Text>
          <View style={styles.categoryButtons}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === 'All' && styles.selectedCategoryButton
              ]}
              onPress={() => setSelectedCategory('All')}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === 'All' && styles.selectedCategoryButtonText
              ]}>All</Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  selectedCategory === cat && styles.selectedCategoryButton
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === cat && styles.selectedCategoryButtonText
                ]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
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
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([
    {
      id: '1',
      name: 'Cheesy Pasta',
      ingredients: ['pasta', 'butter', 'parmesan', 'garlic', 'salt', 'pepper'],
      instructions: '1. Cook pasta according to package instructions\n2. Melt butter in a pan\n3. Add minced garlic and cook until fragrant\n4. Add cooked pasta and toss\n5. Add parmesan, salt, and pepper\n6. Stir until cheese is melted'
    },
  ]);
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);

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
        setAvailableIngredients(parsedIngredients.map((ing: Ingredient) => ing.name.toLowerCase()));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load ingredients');
    }
  };

  const canMakeRecipe = (recipe: Recipe) => {
    return recipe.ingredients.every(ingredient => 
      availableIngredients.some(available => 
        available.includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(available)
      )
    );
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(searchQuery.toLowerCase()));
    return searchQuery ? matchesSearch : true;
  });

  const renderRecipe = ({ item }: { item: Recipe }) => {
    const canMake = canMakeRecipe(item);
    return (
      <View style={[styles.recipeItem, !canMake && styles.recipeItemUnavailable]}>
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeName}>{item.name}</Text>
          {canMake ? (
            <View style={styles.canMakeTag}>
              <Text style={styles.canMakeText}>Can Make!</Text>
            </View>
          ) : (
            <View style={styles.cannotMakeTag}>
              <Text style={styles.cannotMakeText}>Missing Ingredients</Text>
            </View>
          )}
        </View>
        <Text style={styles.recipeSubtitle}>Ingredients:</Text>
        <View style={styles.ingredientTags}>
          {item.ingredients.map((ingredient, index) => (
            <View 
              key={index} 
              style={[
                styles.ingredientTag,
                availableIngredients.some(available => 
                  available.includes(ingredient.toLowerCase()) || ingredient.toLowerCase().includes(available)
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

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
          </Drawer.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  ingredientInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  suggestionsContainer: {
    marginTop: -15,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  quantityContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  quantityInputWrapper: {
    flex: 2,
  },
  unitInputWrapper: {
    flex: 1,
  },
  quantityInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  unitInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333',
    backgroundColor: '#fff',
  },
  pickerItem: {
    fontSize: 16,
    color: '#333',
    height: 50,
  },
  dateButton: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    justifyContent: 'center',
    marginBottom: 20,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ingredientItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ingredientTextContainer: {
    flex: 1,
    marginRight: 15,
  },
  ingredientName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  ingredientDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ingredientCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  expirationDate: {
    fontSize: 14,
    color: '#ff4444',
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#ff4444',
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ff4444',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recipeItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  recipeItemUnavailable: {
    opacity: 0.7,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  canMakeTag: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  canMakeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  cannotMakeTag: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  cannotMakeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  recipeSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  ingredientTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientTag: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  availableIngredient: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  missingIngredient: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  ingredientTagText: {
    fontSize: 14,
    color: '#2e7d32',
  },
  recipeInstructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedCategoryButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  combineSelectedButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  combineSelectedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  recipeSource: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  recipeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  recipeStat: {
    fontSize: 14,
    color: '#666',
  },
  viewRecipeButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  viewRecipeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 15,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  searchButton: {
    height: 50,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  selectedItem: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  combineButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 6,
    flex: 1,
  },
  selectedCombineButton: {
    backgroundColor: '#2E7D32',
  },
  combineButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  drawerHeader: {
    height: 150,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  drawerHeaderTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  drawerHeaderSubtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
});
