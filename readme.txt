ssh -i ~/Downloads/digisol-zabbix.pem digisol@194.163.137.54 'cd /srv/coex/app 
&& git pull && npm run build && pm2 restart coex-app'