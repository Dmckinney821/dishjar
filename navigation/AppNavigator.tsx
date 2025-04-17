import React from 'react';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerItemList } from '@react-navigation/drawer';

import HomeScreen from '../src/screens/HomeScreen';
import RecipeScreen from '../src/screens/RecipeScreen';
import WhatsForDinnerScreen from '../src/screens/WhatsForDinnerScreen';
import ViewIngredientsScreen from '../src/screens/ViewIngredientsScreen';
import ShoppingListScreen from '../src/screens/ShoppingListScreen';
import PantryScreen from '../src/screens/PantryScreen';
import AddIngredientScreen from '../src/screens/AddIngredientScreen';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props: DrawerContentComponentProps) => (
  <ScrollView>
    <View style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>DishJar</Text>
      </View>
      <DrawerItemList {...props} />
    </View>
  </ScrollView>
);

export const AppNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: '#fff',
          width: '80%',
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          drawerIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Recipes"
        component={RecipeScreen}
        options={{
          title: 'Recipes',
          drawerIcon: ({ color }) => (
            <Ionicons name="book-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="WhatsForDinner"
        component={WhatsForDinnerScreen}
        options={{
          title: "What's for Dinner",
          drawerIcon: ({ color }) => (
            <Ionicons name="restaurant-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ViewIngredients"
        component={ViewIngredientsScreen}
        options={{
          title: 'View Ingredients',
          drawerIcon: ({ color }) => (
            <Ionicons name="list-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AddIngredient"
        component={AddIngredientScreen}
        options={{
          title: 'Add Ingredient',
          drawerIcon: ({ color }) => (
            <Ionicons name="add-circle-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{
          title: 'Shopping List',
          drawerIcon: ({ color }) => (
            <Ionicons name="cart-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Pantry"
        component={PantryScreen}
        options={{
          title: 'Pantry',
          drawerIcon: ({ color }) => (
            <Ionicons name="basket-outline" size={24} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 20,
  },
  drawerHeader: {
    height: 100,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 