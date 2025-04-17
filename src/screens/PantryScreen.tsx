import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  dateAdded: string;
}

export default function PantryScreen() {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('PantryScreen mounted, loading items...');
    loadPantryItems();
  }, []);

  const loadPantryItems = async () => {
    try {
      console.log('Loading pantry items...');
      const pantry = await AsyncStorage.getItem('pantry');
      console.log('Loaded pantry data:', pantry);
      if (pantry) {
        const parsedItems = JSON.parse(pantry);
        console.log('Parsed pantry items:', parsedItems);
        setPantryItems(parsedItems);
      } else {
        console.log('No pantry items found');
        setPantryItems([]);
      }
    } catch (error) {
      console.error('Error loading pantry items:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const updatedItems = pantryItems.filter(item => item.id !== id);
      await AsyncStorage.setItem('pantry', JSON.stringify(updatedItems));
      setPantryItems(updatedItems);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const onRefresh = async () => {
    console.log('Refreshing pantry items...');
    setRefreshing(true);
    await loadPantryItems();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: PantryItem }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDetails}>
          {item.quantity} {item.unit}
        </Text>
        <Text style={styles.itemDate}>
          Added: {new Date(item.dateAdded).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pantry</Text>
      {pantryItems.length === 0 ? (
        <Text style={styles.emptyText}>Your pantry is empty</Text>
      ) : (
        <FlatList
          data={pantryItems}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        />
      )}
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
  list: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  itemDate: {
    fontSize: 14,
    color: '#999',
  },
  deleteButton: {
    padding: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
}); 