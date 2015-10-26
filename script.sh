echo "word to replace"
read variable
LANG=C LANG_ALL=C find js/app -type f -exec sed -i '' "s/chrome\.extension\.$variable/chrome\.runtime\.$variable/g" {} +
