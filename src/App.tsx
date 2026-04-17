import { useState, useEffect } from 'react'
import Login from './pages/Login'
import RecipeList from './pages/RecipeList'
import RecipeDetail from './pages/RecipeDetail'
import AddRecipe from './pages/AddRecipe'
import EditRecipe from './pages/EditRecipe'
import GroceryList from './pages/GroceryList'
import CollectionList from './pages/CollectionList'
import CollectionDetail from './pages/CollectionDetail'
import More from './pages/More'
import BottomNav from './components/BottomNav'
import { type Recipe, type Collection } from './lib/supabase'

type Screen = 'login' | 'list' | 'detail' | 'add' | 'edit' | 'grocery' | 'collections' | 'collection-detail' | 'more'

export default function App() {
  const isAuthed = sessionStorage.getItem('kitchen-auth') === 'true'
  const [screen, setScreen] = useState<Screen>(isAuthed ? 'list' : 'login')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [recipeFrom, setRecipeFrom] = useState<'list' | 'collection-detail'>('list')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => { window.scrollTo(0, 0) }, [screen])

  function refresh() {
    setRefreshKey(k => k + 1)
    setScreen('list')
  }

  function openRecipe(recipe: Recipe, from: 'list' | 'collection-detail') {
    setSelectedRecipe(recipe)
    setRecipeFrom(from)
    setScreen('detail')
  }

  function renderScreen() {
    if (screen === 'login') {
      return <Login onLogin={() => setScreen('list')} />
    }
    if (screen === 'detail' && selectedRecipe) {
      return (
        <RecipeDetail
          recipe={selectedRecipe}
          onBack={() => setScreen(recipeFrom)}
          onDelete={refresh}
          onEdit={() => setScreen('edit')}
          onDuplicate={r => { setSelectedRecipe(r); setScreen('edit') }}
        />
      )
    }
    if (screen === 'edit' && selectedRecipe) {
      return (
        <EditRecipe
          recipe={selectedRecipe}
          onBack={() => setScreen('detail')}
          onSaved={updated => { setSelectedRecipe(updated); setScreen('detail') }}
        />
      )
    }
    if (screen === 'add') {
      return <AddRecipe onBack={() => setScreen('list')} onSaved={refresh} />
    }
    if (screen === 'grocery') {
      return <GroceryList onBack={() => setScreen('list')} />
    }
    if (screen === 'collections') {
      return (
        <CollectionList
          onSelect={col => { setSelectedCollection(col); setScreen('collection-detail') }}
        />
      )
    }
    if (screen === 'collection-detail' && selectedCollection) {
      return (
        <CollectionDetail
          collection={selectedCollection}
          onBack={() => setScreen('collections')}
          onSelect={recipe => openRecipe(recipe, 'collection-detail')}
        />
      )
    }
    if (screen === 'more') {
      return <More />
    }
    return (
      <RecipeList
        onSelect={recipe => openRecipe(recipe, 'list')}
        refreshKey={refreshKey}
      />
    )
  }

  return (
    <>
      {renderScreen()}
      {screen !== 'login' && (
        <BottomNav
          screen={screen}
          onNavigate={s => {
            if (s === 'add') setScreen('add')
            else if (s === 'grocery') setScreen('grocery')
            else if (s === 'collections') setScreen('collections')
            else if (s === 'more') setScreen('more')
            else setScreen('list')
          }}
        />
      )}
    </>
  )
}
