import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AddIngredientScreen() {
  const [ingredientName, setIngredientName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const resetForm = () => {
    setIngredientName('');
    setQuantity('');
    setUnit('');
  };

  const handleAddIngredient = async () => {
    if (!ingredientName || !quantity || !unit) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      // Get existing pantry items
      const existingPantry = await AsyncStorage.getItem('pantry');
      console.log('Existing pantry:', existingPantry);
      const pantryItems = existingPantry ? JSON.parse(existingPantry) : [];

      // Add new ingredient
      const newIngredient = {
        id: Date.now().toString(),
        name: ingredientName,
        quantity: parseFloat(quantity),
        unit: unit,
        dateAdded: new Date().toISOString(),
      };
      console.log('New ingredient:', newIngredient);

      // Update pantry
      const updatedPantry = [...pantryItems, newIngredient];
      console.log('Updated pantry:', updatedPantry);
      await AsyncStorage.setItem('pantry', JSON.stringify(updatedPantry));

      // Verify the save
      const savedPantry = await AsyncStorage.getItem('pantry');
      console.log('Saved pantry:', savedPantry);

      // Show success modal
      setShowSuccessModal(true);
      
      // Reset form
      resetForm();

      // Hide modal after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving to pantry:', error);
      Alert.alert('Error', 'Failed to add ingredient to pantry');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Ingredient</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Ingredient Name</Text>
        <TextInput
          style={styles.input}
          value={ingredientName}
          onChangeText={setIngredientName}
          placeholder="Enter ingredient name"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Enter quantity"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Unit</Text>
        <TextInput
          style={styles.input}
          value={unit}
          onChangeText={setUnit}
          placeholder="Enter unit (e.g., cups, grams)"
        />
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
        <Text style={styles.addButtonText}>Add Ingredient</Text>
      </TouchableOpacity>

      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.successText}>Ingredient added to pantry!</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    alignItems: 'center',
    elevation: 5,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
}); 