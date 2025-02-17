import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  makeStyles,
  MenuItem,
  Popover,
  Select,
  Toolbar,
  Typography,
  useTheme,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/AddCircleOutline';
import SettingsIcon from '@material-ui/icons/Settings';
import PolicyIcon from '@material-ui/icons/Policy';
import * as React from 'react';
import { GuardoniConfig, PlatformConfig, Platform } from '../../guardoni/types';
import TKLogo from './icons/TKLogo';
import YTLogo from './icons/YTLogo';
import AdvancedSettingModal from './modals/AdvancedSettingModal';
import cx from 'classnames';
import botttsSprites from '@dicebear/avatars-bottts-sprites';
import Avatars from '@dicebear/avatars';
import { useHistory } from 'react-router';
import AddProfileModal from './modals/AddProfileModal';

const botAvatars = new Avatars(botttsSprites, { r: 50, base64: true });

const useStyles = makeStyles((theme) => ({
  platformLogoBox: {
    marginRight: 20,
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  platformLogo: {
    padding: 15,
    opacity: 0.2,
  },
  platformLogoSelected: {
    opacity: 1,
  },
  profileSelect: {
    minWidth: '50%',
  },
  settingButton: {
    ...theme.typography.body1,
    margin: theme.spacing(1),
    fontSize: '18px',
  },
}));

export interface HeaderProps {
  config: GuardoniConfig;
  platform: PlatformConfig;
  profiles: string[];
  onConfigChange: (c: GuardoniConfig) => void;
  onPlatformChange: (p: Platform) => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  platform,
  profiles,
  onConfigChange,
  onPlatformChange,
}) => {
  const popoverId = 'header-popover';

  const theme = useTheme();
  const classes = useStyles();
  const history = useHistory();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [addProfileDialogOpen, setAddProfileDialogOpen] = React.useState(false);
  const [advancedSettingDialogOpen, setAdvancedSettingDialogOpen] =
    React.useState(false);

  const avatar = React.useMemo(
    () => botAvatars.create(config.profileName),
    [config.profileName]
  );

  return (
    <AppBar
      position="static"
      elevation={0}
      style={{
        borderBottom: 'solid black 2px',
      }}
    >
      <Toolbar>
        <Box style={{ paddingBottom: theme.spacing(2) }}>
          <Typography
            variant="h1"
            style={{
              fontSize: theme.spacing(5),
              paddingTop: theme.spacing(1.5),
              marginBottom: -5,
              cursor: 'pointer',
            }}
            onClick={() => {
              history.replace('/');
            }}
          >
            Guardoni
          </Typography>
          <Typography
            variant="caption"
            style={{
              display: 'flex',
              flexDirection: 'row-reverse',
              backgroundColor: 'black',
              color: 'white',
            }}
          >
            -v{process.env.VERSION} - {process.env.NODE_ENV}-
          </Typography>
        </Box>
        <Box className={classes.platformLogoBox}>
          <div
            className={cx(classes.platformLogo, {
              [classes.platformLogoSelected]: platform.name === 'youtube',
            })}
            onClick={() => onPlatformChange('youtube')}
          >
            <YTLogo />
          </div>
          <div
            className={cx(classes.platformLogo, {
              [classes.platformLogoSelected]: platform.name === 'tiktok',
            })}
            onClick={() => onPlatformChange('tiktok')}
          >
            <TKLogo />
          </div>
        </Box>
        <Box>
          <Avatar
            src={avatar}
            aria-describedby={popoverId}
            onClick={() => setPopoverOpen(true)}
            style={{
              border: 'solid black 2px',
              backgroundColor: 'transparent',
              color: 'black',
            }}
          />
          <Popover
            elevation={0}
            id={popoverId}
            open={popoverOpen}
            style={{
              top: 70,
            }}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            onClick={() => {
              setPopoverOpen(false);
            }}
          >
            <Box
              style={{
                padding: 30,
                paddingTop: 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 400,
                border: 'solid #23aa9a 2px',
                borderTop: 'solid black 2px',
              }}
            >
              <Box style={{ marginBottom: theme.spacing(2) }}>
                <Avatar
                  src={avatar}
                  alt={config.profileName}
                  style={{
                    border: 'solid black 2px',
                    backgroundColor: 'transparent',
                    color: 'black',
                  }}
                />
              </Box>

              <Typography
                variant="h5"
                style={{
                  marginBottom: theme.spacing(2),
                }}
              >
                Profile Name
              </Typography>
              <Select
                id="profileName"
                className={classes.profileSelect}
                value={config.profileName}
                onChange={(e) => {
                  onConfigChange({
                    ...config,
                    profileName: e.target.value as string,
                  });
                }}
              >
                {profiles.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
              <Divider
                style={{
                  width: '50%',
                  background: theme.palette.primary.main,
                  marginTop: theme.spacing(4),
                  marginBottom: theme.spacing(4),
                }}
              />
              <Button
                className={classes.settingButton}
                startIcon={<AddIcon color="primary" />}
                onClick={() => {
                  setAddProfileDialogOpen(true);
                }}
              >
                Add profile
              </Button>
              <Button
                className={classes.settingButton}
                startIcon={<SettingsIcon color="primary" />}
                onClick={() => {
                  setAdvancedSettingDialogOpen(true);
                }}
              >
                Advanced settings
              </Button>
              <Button
                className={classes.settingButton}
                startIcon={<PolicyIcon color="primary" />}
              >
                Privacy Policy
              </Button>
            </Box>
          </Popover>
        </Box>
      </Toolbar>
      <AdvancedSettingModal
        open={advancedSettingDialogOpen}
        config={config}
        platform={platform}
        onConfigChange={onConfigChange}
        onCancel={() => {
          setAdvancedSettingDialogOpen(false);
        }}
      />
      <AddProfileModal
        open={addProfileDialogOpen}
        config={config}
        onConfigChange={onConfigChange}
        onCancel={() => {
          setAddProfileDialogOpen(false);
        }}
      />
    </AppBar>
  );
};
