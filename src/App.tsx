import { useState, useEffect } from 'react'
import Login from './pages/Login'
import RecipeList from './pages/RecipeList'
import RecipeDetail from './pages/RecipeDetail'
import AddRecipe from './pages/AddRecipe'
import EditRecipe from './pages/EditRecipe'
import GroceryList from './pages/GroceryList'
import BottomNav from './components/BottomNav'
import { type Recipe } from './lib/supabase'

type Screen = 'login' | 'list' | 'detail' | 'add' | 'edit' | 'grocery'

export default function App() {
  const isAuthed = sessionStorage.getItem('kitchen-auth') === 'true'
  const [screen, setScreen] = useState<Screen>(isAuthed ? 'list' : 'login')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => { window.scrollTo(0, 0) }, [screen])

  function refresh() {
    setRefreshKey(k => k + 1)
    setScreen('list')
  }

  function renderScreen() {
    if (screen === 'login') {
      return <Login onLogin={() => setScreen('list')} />
    }
    if (screen === 'detail' && selectedRecipe) {
      return (
        <RecipeDetail
          recipe={selectedRecipe}
          onBack={() => setScreen('list')}
          onDelete={refresh}
          onEdit={() => setScreen('edit')}
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
    return (
      <RecipeList
        onSelect={recipe => { setSelectedRecipe(recipe); setScreen('detail') }}
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
            else setScreen('list')
          }}
        />
      )}
    </>
  )
}
