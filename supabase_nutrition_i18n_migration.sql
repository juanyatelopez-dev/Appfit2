alter table public.food_database
  add column if not exists food_name_i18n jsonb,
  add column if not exists category_i18n jsonb;

alter table public.nutrition_entries
  add column if not exists food_name_i18n jsonb;

alter table public.nutrition_favorites
  add column if not exists name_i18n jsonb;

update public.food_database
set category_i18n = case lower(category)
  when 'proteins' then jsonb_build_object('en', 'Proteins', 'es', 'Proteinas')
  when 'carbohydrates' then jsonb_build_object('en', 'Carbohydrates', 'es', 'Carbohidratos')
  when 'fruits' then jsonb_build_object('en', 'Fruits', 'es', 'Frutas')
  when 'vegetables' then jsonb_build_object('en', 'Vegetables', 'es', 'Vegetales')
  when 'fats and nuts' then jsonb_build_object('en', 'Fats and Nuts', 'es', 'Grasas y frutos secos')
  when 'dairy' then jsonb_build_object('en', 'Dairy', 'es', 'Lacteos')
  when 'beverages' then jsonb_build_object('en', 'Beverages', 'es', 'Bebidas')
  else coalesce(category_i18n, jsonb_build_object('en', category, 'es', category))
end;

update public.food_database
set food_name_i18n = case food_name
  when 'Chicken breast' then jsonb_build_object('en', 'Chicken breast', 'es', 'Pechuga de pollo')
  when 'Turkey breast' then jsonb_build_object('en', 'Turkey breast', 'es', 'Pechuga de pavo')
  when 'Lean beef' then jsonb_build_object('en', 'Lean beef', 'es', 'Carne de res magra')
  when 'Pork loin' then jsonb_build_object('en', 'Pork loin', 'es', 'Lomo de cerdo')
  when 'Salmon' then jsonb_build_object('en', 'Salmon', 'es', 'Salmon')
  when 'Tuna' then jsonb_build_object('en', 'Tuna', 'es', 'Atun')
  when 'Shrimp' then jsonb_build_object('en', 'Shrimp', 'es', 'Camaron')
  when 'Egg' then jsonb_build_object('en', 'Egg', 'es', 'Huevo')
  when 'Egg white' then jsonb_build_object('en', 'Egg white', 'es', 'Clara de huevo')
  when 'Tofu' then jsonb_build_object('en', 'Tofu', 'es', 'Tofu')
  when 'Tempeh' then jsonb_build_object('en', 'Tempeh', 'es', 'Tempeh')
  when 'Greek yogurt' then jsonb_build_object('en', 'Greek yogurt', 'es', 'Yogur griego')
  when 'Cottage cheese' then jsonb_build_object('en', 'Cottage cheese', 'es', 'Queso cottage')
  when 'Cheddar cheese' then jsonb_build_object('en', 'Cheddar cheese', 'es', 'Queso cheddar')
  when 'Mozzarella' then jsonb_build_object('en', 'Mozzarella', 'es', 'Mozzarella')
  when 'White rice' then jsonb_build_object('en', 'White rice', 'es', 'Arroz blanco')
  when 'Brown rice' then jsonb_build_object('en', 'Brown rice', 'es', 'Arroz integral')
  when 'Pasta' then jsonb_build_object('en', 'Pasta', 'es', 'Pasta')
  when 'Whole wheat pasta' then jsonb_build_object('en', 'Whole wheat pasta', 'es', 'Pasta integral')
  when 'Oats' then jsonb_build_object('en', 'Oats', 'es', 'Avena')
  when 'Quinoa' then jsonb_build_object('en', 'Quinoa', 'es', 'Quinua')
  when 'Barley' then jsonb_build_object('en', 'Barley', 'es', 'Cebada')
  when 'Corn' then jsonb_build_object('en', 'Corn', 'es', 'Maiz')
  when 'Potato' then jsonb_build_object('en', 'Potato', 'es', 'Papa')
  when 'Sweet potato' then jsonb_build_object('en', 'Sweet potato', 'es', 'Camote')
  when 'Bread white' then jsonb_build_object('en', 'Bread white', 'es', 'Pan blanco')
  when 'Bread whole wheat' then jsonb_build_object('en', 'Bread whole wheat', 'es', 'Pan integral')
  when 'Tortilla corn' then jsonb_build_object('en', 'Tortilla corn', 'es', 'Tortilla de maiz')
  when 'Tortilla flour' then jsonb_build_object('en', 'Tortilla flour', 'es', 'Tortilla de harina')
  when 'Apple' then jsonb_build_object('en', 'Apple', 'es', 'Manzana')
  when 'Banana' then jsonb_build_object('en', 'Banana', 'es', 'Platano')
  when 'Orange' then jsonb_build_object('en', 'Orange', 'es', 'Naranja')
  when 'Strawberry' then jsonb_build_object('en', 'Strawberry', 'es', 'Fresa')
  when 'Blueberry' then jsonb_build_object('en', 'Blueberry', 'es', 'Arandano')
  when 'Pineapple' then jsonb_build_object('en', 'Pineapple', 'es', 'Pina')
  when 'Mango' then jsonb_build_object('en', 'Mango', 'es', 'Mango')
  when 'Grapes' then jsonb_build_object('en', 'Grapes', 'es', 'Uvas')
  when 'Watermelon' then jsonb_build_object('en', 'Watermelon', 'es', 'Sandia')
  when 'Papaya' then jsonb_build_object('en', 'Papaya', 'es', 'Papaya')
  when 'Kiwi' then jsonb_build_object('en', 'Kiwi', 'es', 'Kiwi')
  when 'Peach' then jsonb_build_object('en', 'Peach', 'es', 'Durazno')
  when 'Broccoli' then jsonb_build_object('en', 'Broccoli', 'es', 'Brocoli')
  when 'Spinach' then jsonb_build_object('en', 'Spinach', 'es', 'Espinaca')
  when 'Carrot' then jsonb_build_object('en', 'Carrot', 'es', 'Zanahoria')
  when 'Tomato' then jsonb_build_object('en', 'Tomato', 'es', 'Tomate')
  when 'Cucumber' then jsonb_build_object('en', 'Cucumber', 'es', 'Pepino')
  when 'Onion' then jsonb_build_object('en', 'Onion', 'es', 'Cebolla')
  when 'Garlic' then jsonb_build_object('en', 'Garlic', 'es', 'Ajo')
  when 'Bell pepper' then jsonb_build_object('en', 'Bell pepper', 'es', 'Pimiento')
  when 'Zucchini' then jsonb_build_object('en', 'Zucchini', 'es', 'Calabacin')
  when 'Eggplant' then jsonb_build_object('en', 'Eggplant', 'es', 'Berenjena')
  when 'Mushrooms' then jsonb_build_object('en', 'Mushrooms', 'es', 'Champinones')
  when 'Lettuce' then jsonb_build_object('en', 'Lettuce', 'es', 'Lechuga')
  when 'Olive oil' then jsonb_build_object('en', 'Olive oil', 'es', 'Aceite de oliva')
  when 'Butter' then jsonb_build_object('en', 'Butter', 'es', 'Mantequilla')
  when 'Avocado' then jsonb_build_object('en', 'Avocado', 'es', 'Palta')
  when 'Peanut butter' then jsonb_build_object('en', 'Peanut butter', 'es', 'Mantequilla de mani')
  when 'Almonds' then jsonb_build_object('en', 'Almonds', 'es', 'Almendras')
  when 'Walnuts' then jsonb_build_object('en', 'Walnuts', 'es', 'Nueces')
  when 'Cashews' then jsonb_build_object('en', 'Cashews', 'es', 'Castanas de caju')
  when 'Chia seeds' then jsonb_build_object('en', 'Chia seeds', 'es', 'Semillas de chia')
  when 'Flax seeds' then jsonb_build_object('en', 'Flax seeds', 'es', 'Semillas de linaza')
  when 'Sunflower seeds' then jsonb_build_object('en', 'Sunflower seeds', 'es', 'Semillas de girasol')
  when 'Milk whole' then jsonb_build_object('en', 'Whole milk', 'es', 'Leche entera')
  when 'Milk skim' then jsonb_build_object('en', 'Skim milk', 'es', 'Leche descremada')
  when 'Yogurt plain' then jsonb_build_object('en', 'Plain yogurt', 'es', 'Yogur natural')
  when 'Yogurt flavored' then jsonb_build_object('en', 'Flavored yogurt', 'es', 'Yogur saborizado')
  when 'Cream' then jsonb_build_object('en', 'Cream', 'es', 'Crema de leche')
  when 'Water' then jsonb_build_object('en', 'Water', 'es', 'Agua')
  when 'Coffee' then jsonb_build_object('en', 'Coffee', 'es', 'Cafe')
  when 'Tea' then jsonb_build_object('en', 'Tea', 'es', 'Te')
  when 'Beer' then jsonb_build_object('en', 'Beer', 'es', 'Cerveza')
  when 'Wine' then jsonb_build_object('en', 'Wine', 'es', 'Vino')
  when 'Soda' then jsonb_build_object('en', 'Soda', 'es', 'Gaseosa')
  when 'Orange juice' then jsonb_build_object('en', 'Orange juice', 'es', 'Jugo de naranja')
  when 'Apple juice' then jsonb_build_object('en', 'Apple juice', 'es', 'Jugo de manzana')
  else coalesce(food_name_i18n, jsonb_build_object('en', food_name, 'es', food_name))
end;

update public.nutrition_entries
set food_name_i18n = coalesce(food_name_i18n, jsonb_build_object('en', food_name, 'es', food_name));

update public.nutrition_favorites
set name_i18n = coalesce(name_i18n, jsonb_build_object('en', name, 'es', name));

create index if not exists food_database_food_name_i18n_gin_idx
  on public.food_database using gin (food_name_i18n jsonb_path_ops);

create index if not exists food_database_category_i18n_gin_idx
  on public.food_database using gin (category_i18n jsonb_path_ops);
