import { useState } from 'react'
import Login from './pages/Login'
import RecipeList from './pages/RecipeList'
import RecipeDetail from './pages/RecipeDetail'
import AddRecipe from './pages/AddRecipe'
import { type Recipe } from './lib/supabase'

type Screen = 'login' | 'list' | 'detail' | 'add'

export default function App() {
  const isAuthed = sessionStorage.getItem('kitchen-auth') === 'true'
  const [screen, setScreen] = useState<Screen>(isAuthed ? 'list' : 'login')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  function refresh() {
    setRefreshKey(k => k + 1)
    setScreen('list')
  }

  if (screen === 'login') {
    return <Login onLogin={() => setScreen('list')} />
  }

  if (screen === 'detail' && selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        onBack={() => setScreen('list')}
        onDelete={refresh}
      />
    )
  }

  if (screen === 'add') {
    return (
      <AddRecipe
        onBack={() => setScreen('list')}
        onSaved={refresh}
      />
    )
  }

  return (
    <RecipeList
      onSelect={recipe => { setSelectedRecipe(recipe); setScreen('detail') }}
      onAdd={() => setScreen('add')}
      refreshKey={refreshKey}
    />
  )
}
